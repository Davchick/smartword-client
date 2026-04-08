import { useState, useCallback, useRef } from 'react';
import { apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useChat = () => {
  const { user: authUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const groupIdRef = useRef<string | undefined>(undefined);
  const groupNameRef = useRef<string | undefined>(undefined);
  const messagesRef = useRef<ChatMessage[]>([]);
  // Ref для дедупликации — предотвращает одновременные запросы при быстрых кликах
  const sendingRef = useRef(false);

  const setGroup = useCallback((id?: string, name?: string) => {
    groupIdRef.current = id;
    groupNameRef.current = name;
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    // Дедупликация — если уже идёт отправка, игнорируем повторный вызов
    if (sendingRef.current) return;
    if (!authUser || !getBaseUrl()) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Необходима авторизация. Войдите в аккаунт.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    // Обновляем ref СИНХРОННО перед использованием — гарантируем консистентность
    messagesRef.current = [...messagesRef.current, userMessage];

    // Отправляем только последние 20 сообщений — AI достаточно контекста,
    // а экономим трафик и время обработки при длинных чатах
    const MAX_CONTEXT_MESSAGES = 20;
    const contextMessages = messagesRef.current.slice(-MAX_CONTEXT_MESSAGES);
    const apiMessages = contextMessages.map((m) => ({ role: m.role, content: m.content }));

    // State обновляем отдельно — не зависит от ref для render
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    sendingRef.current = true;

    try {
      const responseData = await apiPost<{ reply?: string; messages_used?: number; error?: string }>('/chat', {
        messages: apiMessages,
        group_id: groupIdRef.current,
        group_name: groupNameRef.current,
      });

      if (responseData?.error === 'limit_reached') {
        setLimitReached(true);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData?.reply ?? 'Не удалось получить ответ',
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, assistantMessage];
      setMessages((prev) => [...prev, assistantMessage]);

      if (typeof responseData?.messages_used === 'number') {
        setMessagesUsed(responseData.messages_used);
      }
    } catch (err: unknown) {
      console.error('[useChat] error:', err);
      const e = err as { status?: number; body?: { error?: string } };
      let errorContent = 'Ошибка соединения. Попробуйте позже.';

      if (e?.body?.error === 'limit_reached') {
        setLimitReached(true);
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (e?.body?.error === 'No OpenRouter API keys configured') {
        errorContent = 'AI сервис не настроен. Обратитесь к администратору.';
      } else if (e?.body?.error === 'All OpenRouter API keys exhausted') {
        errorContent = 'Превышен лимит запросов. Попробуйте через минуту.';
      } else if (e?.body?.error?.includes('rate limit')) {
        errorContent = 'Превышен лимит запросов. Попробуйте через минуту.';
      } else if (e?.status === 401) {
        errorContent = 'Необходима авторизация. Войдите в аккаунт.';
      } else if (e?.status === 403) {
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (e?.status === 502) {
        errorContent = 'AI сервис временно недоступен. Попробуйте позже.';
      } else if (typeof e?.body?.error === 'string') {
        errorContent = e.body.error;
      }

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, errorMessage];
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [authUser]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setLimitReached(false);
    groupIdRef.current = undefined;
    groupNameRef.current = undefined;
  }, []);

  return { messages, loading, messagesUsed, limitReached, sendMessage, setGroup, clearMessages };
};
