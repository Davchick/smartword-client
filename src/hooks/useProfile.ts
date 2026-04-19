/**
 * useProfile — React Query версия.
 *
 * Профиль — серверные данные → React Query.
 * avatarId/nickname — локальное UI-состояние → AsyncStorage (без изменений).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';

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
  authUser: ReturnType<typeof useAuth>['user']
): Promise<Profile | null> {
  if (!authUser) {
    return null;
  }

  if (!getBaseUrl()) {
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
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKey.profile.me(),
    queryFn: () => fetchProfileQuery(authUser),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!authUser,
    notifyOnChangeProps: ['data', 'isLoading'],
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

  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: queryKey.profile.me() });
    await queryClient.refetchQueries({ queryKey: queryKey.stats.overview() });
    await queryClient.refetchQueries({ queryKey: queryKey.stats.trainingProgress() });
    await queryClient.refetchQueries({ queryKey: queryKey.streaks.current() });
  }, [queryClient]);

  return {
    profile: profileOrFromAuth,
    loading,
    isFetching,
    refetch: handleRefresh,
    avatarId,
    setAvatarId,
    nickname,
    setNickname,
  };
};
