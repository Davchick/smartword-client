/**
 * useProfile — React Query версия.
 *
 * Профиль — серверные данные → React Query.
 * avatarId/nickname — локальное UI-состояние → AsyncStorage (без изменений).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateProfile } from '../lib/queryKeys';

export interface Profile {
  id: string;
  is_premium: boolean;
  ai_messages_used: number;
  last_ai_message_reset_at?: string; // ISO date string from server
  created_at: string;
  subscription_type?: string | null;
  subscription_expires_at?: string | null;
  words_learned_this_week?: number;
  weekly_limit?: number;
}

const AVATAR_KEY = 'smartword_avatar_id';
const NICKNAME_KEY = 'smartword_nickname';

// ─── Query function ────────────────────────────────────────────────────

async function fetchProfileQuery(
  authUser: ReturnType<typeof useAuth>['user'],
  queryClient: ReturnType<typeof useQueryClient>
): Promise<Profile | null> {
  if (!authUser) {
    return null;
  }

  // Проверяем кэш React Query — AuthContext уже мог загрузить данные
  const cachedProfile = queryClient.getQueryData<Profile>(queryKey.profile.me());
  if (cachedProfile) {
    return cachedProfile;
  }

  // Кэша нет — нужен серверный запрос, но только если есть baseUrl
  if (!getBaseUrl()) {
    // Нет baseUrl — возвращаем fallback из authUser
    return {
      id: authUser.id,
      is_premium: authUser.is_premium,
      ai_messages_used: authUser.ai_messages_used,
      last_ai_message_reset_at: undefined,
      created_at: authUser.created_at,
    };
  }

  const profile = await apiGet<Profile>('/profile');
  return {
    ...profile,
    last_ai_message_reset_at: profile.last_ai_message_reset_at,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export const useProfile = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [avatarId, setAvatarIdState] = useState<number>(0);
  const [nickname, setNicknameState] = useState<string>('');

  const {
    data: serverProfile,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKey.profile.me(),
    queryFn: () => fetchProfileQuery(authUser, queryClient),
    // Профиль — стабильные данные. Refetch только при фокусе экрана.
    staleTime: 10 * 60 * 1000, // 10 мин — профиль меняется крайне редко
    gcTime: 10 * 60 * 1000,
    enabled: !!authUser,
  });

  // Загрузка локального UI-состояния
  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_KEY, NICKNAME_KEY]).then((pairs) => {
      const avatarVal = pairs[0]?.[1];
      const nicknameVal = pairs[1]?.[1];
      if (avatarVal != null) setAvatarIdState(parseInt(avatarVal, 10));
      if (nicknameVal != null) setNicknameState(nicknameVal as string);
    });
  }, []);

  const setAvatarId = useCallback((id: number) => {
    setAvatarIdState(id);
    AsyncStorage.setItem(AVATAR_KEY, String(id));
  }, []);

  const setNickname = useCallback((name: string) => {
    setNicknameState(name);
    AsyncStorage.setItem(NICKNAME_KEY, name);
  }, []);

  // Объединяем серверный профиль с fallback из authUser
  const profileOrFromAuth: Profile | null =
    serverProfile ??
    (authUser
      ? {
          id: authUser.id,
          is_premium: authUser.is_premium,
          ai_messages_used: authUser.ai_messages_used,
          last_ai_message_reset_at: undefined,
          created_at: authUser.created_at,
          subscription_type: (authUser as any).subscription_type ?? null,
          subscription_expires_at: (authUser as any).subscription_expires_at ?? null,
        }
      : null);

  return {
    profile: profileOrFromAuth,
    loading,
    refetch: () => {
      invalidateProfile(queryClient);
      return refetch();
    },
    avatarId,
    setAvatarId,
    nickname,
    setNickname,
  };
};
