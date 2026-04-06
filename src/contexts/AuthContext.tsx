import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, clearTokens, getBaseUrl, getRefreshToken } from '../lib/api';

export interface ApiProfile {
  id: string;
  email: string;
  is_premium: boolean;
  ai_messages_used: number;
  created_at: string;
}

type AuthContextValue = {
  user: ApiProfile | null;
  loading: boolean;
  setUser: (user: ApiProfile | null) => void;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!getBaseUrl()) {
      console.error('[Auth] refetch skipped: getBaseUrl() is empty');
      return;
    }
    try {
      const profile = await apiGet<ApiProfile>('/profile');
      setUserState(profile);
    } catch (err) {
      // НЕ сбрасываем user при ошибке — временный сбой сети не должен «выкидывать» пользователя.
      // Предыдущее состояние сохраняется, UI продолжит работать с кэшированными данными.
      console.error('[Auth] refetch failed, keeping current user state:', err);
    }
  }, []);

  const setUser = useCallback((u: ApiProfile | null) => {
    setUserState(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken && getBaseUrl()) {
        await apiPost('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Игнорируем ошибки — токены всё равно очищаем локально
    }
    await clearTokens();
    setUserState(null);
  }, []);

  useEffect(() => {
    if (!getBaseUrl()) {
      setLoading(false);
      setUserState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiGet<ApiProfile>('/profile');
        if (!cancelled) setUserState(profile);
      } catch {
        if (!cancelled) setUserState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    setUser,
    signOut,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}
