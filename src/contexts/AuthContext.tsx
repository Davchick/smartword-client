import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, clearTokens, getBaseUrl, getRefreshToken } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { queryKey } from '../lib/queryKeys';

export interface ApiProfile {
  id: string;
  email: string;
  is_premium: boolean;
  ai_messages_used: number;
  created_at: string;
}

const GUEST_MODE_KEY = 'smartword_guest_mode';
const HAS_ACCOUNT_KEY = 'smartword_has_account';

type AuthContextValue = {
  user: ApiProfile | null;
  loading: boolean;
  guestMode: boolean;
  setUser: (user: ApiProfile | null) => void;
  setGuestMode: (guest: boolean) => Promise<void>;
  setHasAccount: (has: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestModeState] = useState(false);

  const setGuestMode = useCallback(async (guest: boolean) => {
    setGuestModeState(guest);
    if (guest) {
      await AsyncStorage.setItem(GUEST_MODE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
    }
  }, []);

  const setHasAccount = useCallback(async (has: boolean) => {
    if (has) {
      await AsyncStorage.setItem(HAS_ACCOUNT_KEY, '1');
    } else {
      await AsyncStorage.removeItem(HAS_ACCOUNT_KEY);
    }
  }, []);

  const refetch = useCallback(async () => {
    let baseUrl = '';
    try {
      baseUrl = getBaseUrl();
    } catch (err) {
      console.error('[Auth] refetch: getBaseUrl() threw error:', err);
      return;
    }
    
    if (!baseUrl) {
      console.error('[Auth] refetch skipped: getBaseUrl() is empty');
      return;
    }
    
    try {
      const profile = await apiGet<ApiProfile>('/profile');
      setUserState(profile);
      queryClient.setQueryData(queryKey.profile.me(), profile);
    } catch (err) {
      // НЕ сбрасываем user при ошибке — временный сбой сети не должен «выкидывать» пользователя.
      // Предыдущее состояние сохраняется, UI продолжит работать с кэшированными данными.
      if (__DEV__) {
        console.error('[Auth] refetch failed, keeping current user state:', err);
      }
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
    queryClient.removeQueries({ queryKey: queryKey.profile.all });
    setUserState(null);
    setGuestModeState(false);
    // При выходе сохраняем, что у пользователя есть аккаунт
    // (чтобы RootNavigator показал Welcome, а не Main)
    await AsyncStorage.setItem(HAS_ACCOUNT_KEY, '1');
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Шаг 1: читаем флаги из AsyncStorage
        const [guestStored] = await AsyncStorage.multiGet([GUEST_MODE_KEY]);
        const isGuest = guestStored?.[1] === '1';
        if (!cancelled) {
          setGuestModeState(isGuest);
        }

        // Шаг 2: если гость — пропускаем запрос к серверу.
        // У гостя нет токенов и профиля на сервере — запрос бессмыслен.
        if (isGuest) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Шаг 3: проверяем валидность API URL
        let baseUrl = '';
        try {
          baseUrl = getBaseUrl();
        } catch (err) {
          console.error('[Auth] getBaseUrl() threw error:', err);
          baseUrl = '';
        }

        if (!baseUrl) {
          console.warn('[Auth] No valid API URL — skipping auth check');
          if (!cancelled) setLoading(false);
          return;
        }

        // Шаг 4: пробуем авторизоваться
        try {
          const profile = await apiGet<ApiProfile>('/profile');
          if (!cancelled) {
            setUserState(profile);
            queryClient.setQueryData(queryKey.profile.me(), profile);
            await AsyncStorage.setItem(HAS_ACCOUNT_KEY, '1');
          }
        } catch (err) {
          if (__DEV__) {
            console.warn('[Auth] Initial profile fetch failed (keeping user null):', err);
          }
          if (!cancelled) setUserState(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      } catch (err) {
        if (__DEV__) {
          console.error('[Auth] Auth initialization error:', err);
        }
        if (!cancelled) {
          setGuestModeState(false);
          setUserState(null);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    guestMode,
    setUser,
    setGuestMode,
    setHasAccount,
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
