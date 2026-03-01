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

  const setGroup = useCallback((id?: string, name?: string) => {
    groupIdRef.current = id;
    groupNameRef.current = name;
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    if (!authUser || !getBaseUrl()) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Необходима авторизация. Войдите в аккаунт.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    const apiMessages = [...messagesRef.current, userMessage].map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => {
      const next = [...prev, userMessage];
      messagesRef.current = next;
      return next;
    });
    setLoading(true);

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
      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        messagesRef.current = next;
        return next;
      });
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
      } else if (e?.status === 401) {
        errorContent = 'Необходима авторизация. Войдите в аккаунт.';
      } else if (e?.status === 403) {
        errorContent = 'Лимит сообщений исчерпан.';
      } else if (typeof e?.body?.error === 'string') {
        errorContent = e.body.error;
      }
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: errorContent,
            timestamp: new Date(),
          },
        ];
        messagesRef.current = next;
        return next;
      });
    } finally {
      setLoading(false);
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
