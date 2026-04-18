import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPostWithRetry, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';
import { queryKey } from '../lib/queryKeys';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sendStatus?: 'pending' | 'sent' | 'failed';
}

// Ключи для AsyncStorage — добавляем userId динамически
const CHAT_MESSAGES_KEY = (userId: string) => `chat:messages:${userId}`;
const CHAT_GROUP_KEY = (userId: string) => `chat:group:${userId}`;
const CHAT_LIMIT_REACHED_KEY = (userId: string) => `chat:limitReached:${userId}`;
const CHAT_MESSAGES_USED_KEY = (userId: string) => `chat:messagesUsed:${userId}`;
const CHAT_LAST_RESET_DATE_KEY = (userId: string) => `chat:lastResetDate:${userId}`;
// Максимум сообщений для сохранения — предотвращаем разрастание
const MAX_PERSISTED_MESSAGES = 100;

interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string для сериализации
}

// Возвращает сегодняшнюю дату в формате YYYY-MM-DD для сравнения
const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Парсит серверную дату сброса (ISO string) в локальный ключ дня
const parseServerResetDateKey = (isoDateString?: string): string | null => {
  if (!isoDateString) return null;
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch {
    return null;
  }
};

export const useChat = (serverMessagesUsed?: number, serverResetDateIso?: string) => {
  const { user: authUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState(serverMessagesUsed ?? 0);
  const [limitReached, setLimitReached] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Синхронизация с сервером — когда профиль загрузился или обновился
  useEffect(() => {
    if (typeof serverMessagesUsed === 'number' && serverMessagesUsed > 0) {
      setMessagesUsed(serverMessagesUsed);
    }
  }, [serverMessagesUsed]);

  const groupIdRef = useRef<string | undefined>(undefined);
  const groupNameRef = useRef<string | undefined>(undefined);
  const messagesRef = useRef<ChatMessage[]>([]);
  // Ref для дедупликации — предотвращает одновременные запросы при быстрых кликах
  const sendingRef = useRef(false);

  // ── Загрузка сообщений из AsyncStorage при монтировании / смене пользователя ──
  useEffect(() => {
    if (!authUser?.id) {
      setMessages([]);
      setInitialized(true);
      return;
    }

    let cancelled = false;

    const loadPersisted = async () => {
      try {
        const [messagesRaw, groupRaw, limitReachedRaw, messagesUsedRaw, lastResetDateRaw] = await Promise.all([
          AsyncStorage.getItem(CHAT_MESSAGES_KEY(authUser.id)),
          AsyncStorage.getItem(CHAT_GROUP_KEY(authUser.id)),
          AsyncStorage.getItem(CHAT_LIMIT_REACHED_KEY(authUser.id)),
          AsyncStorage.getItem(CHAT_MESSAGES_USED_KEY(authUser.id)),
          AsyncStorage.getItem(CHAT_LAST_RESET_DATE_KEY(authUser.id)),
        ]);

        if (cancelled) return;

        // Daily reset: используем серверную дату как source of truth
        // Если серверная дата есть — сверяем с ней, иначе — fallback на локальную
        const todayKey = getTodayKey();
        const serverResetKey = parseServerResetDateKey(serverResetDateIso);
        
        // Если есть серверная дата — используем её; иначе — локальную
        const storedResetKey = lastResetDateRaw || serverResetKey;
        const isNewDay = storedResetKey !== todayKey;

        if (messagesRaw) {
          const parsed: PersistedMessage[] = JSON.parse(messagesRaw);
          const restored: ChatMessage[] = parsed.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          // Ограничиваем последние 100 сообщений — не грузим память
          const trimmed = restored.slice(-MAX_PERSISTED_MESSAGES);
          setMessages(trimmed);
          messagesRef.current = trimmed;
        }

        if (groupRaw) {
          const { id, name } = JSON.parse(groupRaw);
          groupIdRef.current = id;
          groupNameRef.current = name;
        }

        if (isNewDay) {
          // Новый день — сбрасываем локальный лимит
          setLimitReached(false);
          setMessagesUsed(0);
          // Сохраняем новую дату сброса (серверную если есть, иначе локальную)
          const resetKeyToStore = serverResetKey || todayKey;
          AsyncStorage.setItem(CHAT_LAST_RESET_DATE_KEY(authUser.id), resetKeyToStore).catch(() => {});
          AsyncStorage.removeItem(CHAT_LIMIT_REACHED_KEY(authUser.id)).catch(() => {});
        } else {
          // Тот же день — восстанавливаем сохранённые значения
          if (limitReachedRaw === 'true') {
            setLimitReached(true);
          }

          if (messagesUsedRaw) {
            const count = parseInt(messagesUsedRaw, 10);
            if (!isNaN(count) && count >= 0) {
              setMessagesUsed(count);
            }
          }
        }

        setInitialized(true);
      } catch (err) {
        console.error('[useChat] Failed to load persisted chat:', err);
        setInitialized(true);
      }
    };

    loadPersisted();
    return () => { cancelled = true; };
  }, [authUser?.id, serverResetDateIso]);

  // ── Сохранение сообщений при каждом изменении ──
  useEffect(() => {
    if (!authUser?.id || !initialized) return;

    // Не сохраняем во время загрузки — только после полной инициализации
    const toPersist = messages.slice(-MAX_PERSISTED_MESSAGES);
    const serialized: PersistedMessage[] = toPersist.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));

    AsyncStorage.setItem(CHAT_MESSAGES_KEY(authUser.id), JSON.stringify(serialized)).catch((err) => {
      console.error('[useChat] Failed to persist messages:', err);
    });
  }, [messages, authUser?.id, initialized]);

  // ── Сохранение messagesUsed при изменении ──
  useEffect(() => {
    if (!authUser?.id || !initialized) return;
    const todayKey = getTodayKey();
    // Сохраняем вместе с датой сброса — для консистентности
    Promise.all([
      AsyncStorage.setItem(CHAT_MESSAGES_USED_KEY(authUser.id), String(messagesUsed)),
      AsyncStorage.setItem(CHAT_LAST_RESET_DATE_KEY(authUser.id), todayKey),
    ]).catch((err) => {
      console.error('[useChat] Failed to persist messagesUsed:', err);
    });
  }, [messagesUsed, authUser?.id, initialized]);

  const setGroup = useCallback((id?: string, name?: string) => {
    groupIdRef.current = id;
    groupNameRef.current = name;

    // Сохраняем группу
    if (authUser?.id) {
      if (id) {
        AsyncStorage.setItem(CHAT_GROUP_KEY(authUser.id), JSON.stringify({ id, name })).catch(() => {});
      } else {
        AsyncStorage.removeItem(CHAT_GROUP_KEY(authUser.id)).catch(() => {});
      }
    }
  }, [authUser?.id]);

  const retryMessage = useCallback(async (messageId: string): Promise<boolean> => {
    const msg = messagesRef.current.find((m) => m.id === messageId);
    if (!msg || msg.role !== 'user') return false;
    if (sendingRef.current) return false;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, sendStatus: 'pending' as const } : m))
    );
    messagesRef.current = messagesRef.current.map((m) =>
      m.id === messageId ? { ...m, sendStatus: 'pending' as const } : m
    );

    const MAX_CONTEXT_MESSAGES = 20;
    const otherMessages = messagesRef.current
      .filter((m) => m.id !== messageId)
      .slice(-MAX_CONTEXT_MESSAGES);
    const apiMessages = otherMessages.map((m) => ({ role: m.role, content: m.content }));

    setLoading(true);
    sendingRef.current = true;

    try {
      const responseData = await apiPostWithRetry<{ reply?: string; messages_used?: number; error?: string }>('/chat', {
        messages: apiMessages,
        group_id: groupIdRef.current,
        group_name: groupNameRef.current,
        isInitialMessage: false,
      });

      if (responseData?.error === 'limit_reached') {
        setLimitReached(true);
        if (authUser?.id) {
          AsyncStorage.setItem(CHAT_LIMIT_REACHED_KEY(authUser.id), 'true').catch(() => {});
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m))
        );
        return false;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData?.reply ?? 'Не удалось получить ответ',
        timestamp: new Date(),
      };

      messagesRef.current = messagesRef.current
        .filter((m) => !(m.role === 'assistant' && m.id !== assistantMessage.id))
        .map((m) => (m.id === messageId ? { ...m, sendStatus: 'sent' as const } : m));
      messagesRef.current = [...messagesRef.current, assistantMessage];

      setMessages((prev) => [
        ...prev
          .filter((m) => !(m.role === 'assistant' && m.id !== assistantMessage.id))
          .map((m) => (m.id === messageId ? { ...m, sendStatus: 'sent' as const } : m)),
        assistantMessage,
      ]);

      if (typeof responseData?.messages_used === 'number') {
        setMessagesUsed(responseData.messages_used);
        setLimitReached(false);
        if (authUser?.id) {
          AsyncStorage.removeItem(CHAT_LIMIT_REACHED_KEY(authUser.id)).catch(() => {});
        }
        queryClient.setQueryData(queryKey.profile.me(), (old) => {
          if (!old) return old;
          return { ...old, ai_messages_used: responseData.messages_used };
        });
      }
      return true;
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string } };
      let errorContent = 'Ошибка соединения. Попробуйте позже.';

      if (e?.body?.error === 'limit_reached') {
        setLimitReached(true);
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (e?.body?.error === 'No OpenRouter API keys configured') {
        errorContent = 'AI сервис не настроен.';
      } else if (e?.body?.error === 'All OpenRouter API keys exhausted') {
        errorContent = 'Превышен лимит запросов. Попробуйте через минуту.';
      } else if (e?.status === 401) {
        errorContent = 'Необходима авторизация.';
      } else if (e?.status === 403) {
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (e?.status === 502) {
        errorContent = 'AI сервис временно недоступен.';
      } else if (typeof e?.body?.error === 'string') {
        errorContent = e.body.error;
      }

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };

      messagesRef.current = messagesRef.current
        .filter((m) => !(m.role === 'assistant' && m.id !== errorMessage.id))
        .map((m) => (m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m));
      messagesRef.current = [...messagesRef.current, errorMessage];

      setMessages((prev) => [
        ...prev
          .filter((m) => !(m.role === 'assistant' && m.id !== errorMessage.id))
          .map((m) => (m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m)),
        errorMessage,
      ]);
      return false;
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [authUser, messagesRef]);

  const sendMessage = useCallback(async (text: string, isInitialMessage?: boolean): Promise<boolean> => {
    if (!text.trim()) return false;
    if (sendingRef.current) return false;
    if (!authUser || !getBaseUrl()) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Необходима авторизация. Войдите в аккаунт.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return false;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      sendStatus: 'pending',
    };

    messagesRef.current = [...messagesRef.current, userMessage];

    const MAX_CONTEXT_MESSAGES = 20;
    const contextMessages = messagesRef.current.slice(-MAX_CONTEXT_MESSAGES);
    const apiMessages = contextMessages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    sendingRef.current = true;

    try {
      const responseData = await apiPostWithRetry<{ reply?: string; messages_used?: number; error?: string }>('/chat', {
        messages: apiMessages,
        group_id: groupIdRef.current,
        group_name: groupNameRef.current,
        isInitialMessage: isInitialMessage ?? false,
      });

      if (responseData?.error === 'limit_reached') {
        setLimitReached(true);
        if (authUser?.id) {
          AsyncStorage.setItem(CHAT_LIMIT_REACHED_KEY(authUser.id), 'true').catch(() => {});
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === userMessage.id ? { ...m, sendStatus: 'failed' as const } : m))
        );
        return false;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData?.reply ?? 'Не удалось получить ответ',
        timestamp: new Date(),
      };
      messagesRef.current = [
        ...messagesRef.current.map((m) =>
          m.id === userMessage.id ? { ...m, sendStatus: 'sent' as const } : m
        ),
        assistantMessage,
      ];
      setMessages((prev) => [
        ...prev
          .map((m) => (m.id === userMessage.id ? { ...m, sendStatus: 'sent' as const } : m)),
        assistantMessage,
      ]);

      if (typeof responseData?.messages_used === 'number') {
        setMessagesUsed(responseData.messages_used);
        setLimitReached(false);
        if (authUser?.id) {
          AsyncStorage.removeItem(CHAT_LIMIT_REACHED_KEY(authUser.id)).catch(() => {});
        }
        queryClient.setQueryData(queryKey.profile.me(), (old) => {
          if (!old) return old;
          return { ...old, ai_messages_used: responseData.messages_used };
        });
      }
      return true;
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string } };
      let errorContent = 'Ошибка соединения. Попробуйте позже.';

      if (e?.body?.error === 'limit_reached') {
        setLimitReached(true);
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (e?.body?.error === 'No OpenRouter API keys configured') {
        errorContent = 'AI сервис не настроен.';
      } else if (e?.body?.error === 'All OpenRouter API keys exhausted') {
        errorContent = 'Превышен лимит запросов. Попробуйте через минуту.';
      } else if (e?.status === 401) {
        errorContent = 'Необходима авторизация.';
      } else if (e?.status === 403) {
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (e?.status === 502) {
        errorContent = 'AI сервис временно недоступен.';
      } else if (typeof e?.body?.error === 'string') {
        errorContent = e.body.error;
      }

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      messagesRef.current = [
        ...messagesRef.current.map((m) =>
          m.id === userMessage.id ? { ...m, sendStatus: 'failed' as const } : m
        ),
        errorMessage,
      ];
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMessage.id ? { ...m, sendStatus: 'failed' as const } : m)),
        errorMessage,
      ]);
      return false;
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [authUser]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setLimitReached(false);
    setMessagesUsed(0);
    groupIdRef.current = undefined;
    groupNameRef.current = undefined;

    // Очищаем AsyncStorage для текущего пользователя
    if (authUser?.id) {
      AsyncStorage.multiRemove([
        CHAT_MESSAGES_KEY(authUser.id),
        CHAT_GROUP_KEY(authUser.id),
        CHAT_LIMIT_REACHED_KEY(authUser.id),
        CHAT_MESSAGES_USED_KEY(authUser.id),
        CHAT_LAST_RESET_DATE_KEY(authUser.id),
      ]).catch((err) => {
        console.error('[useChat] Failed to clear persisted chat:', err);
      });
    }
  }, [authUser?.id]);

  return { messages, loading, messagesUsed, limitReached, sendMessage, retryMessage, setGroup, clearMessages };
};
