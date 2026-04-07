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
  authUser: ReturnType<typeof useAuth>['user']
): Promise<Profile | null> {
  if (!authUser || !getBaseUrl()) {
    return authUser
      ? {
          id: authUser.id,
          is_premium: authUser.is_premium,
          ai_messages_used: authUser.ai_messages_used,
          created_at: authUser.created_at,
        }
      : null;
  }
  return apiGet<Profile>('/profile');
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
    queryFn: () => fetchProfileQuery(authUser),
    // Профиль — стабильные данные. Refetch только при фокусе экрана.
    staleTime: 2 * 60 * 1000, // 2 мин
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
