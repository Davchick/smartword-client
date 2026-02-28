import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  // Храним groupId/groupName в ref чтобы всегда иметь актуальное значение без пересоздания sendMessage
  const groupIdRef = useRef<string | undefined>(undefined);
  const groupNameRef = useRef<string | undefined>(undefined);

  const setGroup = useCallback((id?: string, name?: string) => {
    groupIdRef.current = id;
    groupNameRef.current = name;
  }, []);

  // messagesRef для актуального состояния внутри useCallback
  const messagesRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    // Строим apiMessages ДО обновления стейта — берём актуальный ref + новое сообщение
    const apiMessages = [...messagesRef.current, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => {
      const next = [...prev, userMessage];
      messagesRef.current = next;
      return next;
    });
    setLoading(true);

    try {

      const { data: { session } } = await supabase.auth.getSession();

      const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
      const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
      const token = session?.access_token ?? SUPABASE_ANON_KEY;

      const fetchResponse = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: apiMessages,
          group_id: groupIdRef.current,
          group_name: groupNameRef.current,
        }),
      });

      const responseData = await fetchResponse.json();

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}: ${JSON.stringify(responseData)}`);
      }

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
      let errorContent = 'Ошибка соединения. Попробуйте позже.';
      if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        if (typeof e.message === 'string' && e.message.includes('401')) {
          errorContent = 'Необходима авторизация. Войдите в аккаунт.';
        } else if (typeof e.message === 'string' && e.message.includes('403')) {
          errorContent = 'Лимит сообщений исчерпан.';
        }
      }
      setMessages((prev) => {
        const next = [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: errorContent,
          timestamp: new Date(),
        }];
        messagesRef.current = next;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setLimitReached(false);
    groupIdRef.current = undefined;
    groupNameRef.current = undefined;
  }, []);

  return { messages, loading, messagesUsed, limitReached, sendMessage, setGroup, clearMessages };
};
