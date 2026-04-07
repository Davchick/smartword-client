/**
 * useStreak — React Query версия.
 *
 * - Два отдельных query: текущий streak и история
 * - useMutation для checkIn
 * - invalidateStreaks после мутаций
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateStreaks } from '../lib/queryKeys';
import { UserStreak, StreakHistory } from '../types/achievements';

async function fetchStreak(authUser: ReturnType<typeof useAuth>['user']): Promise<UserStreak | null> {
  if (!authUser || !getBaseUrl()) return null;
  return apiGet<UserStreak>('/streaks');
}

async function fetchStreakHistory(authUser: ReturnType<typeof useAuth>['user']): Promise<StreakHistory[]> {
  if (!authUser || !getBaseUrl()) return [];
  return apiGet<StreakHistory[]>('/streaks/history');
}

export const useStreak = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: streak = null,
    isLoading: loading,
    refetch: refetchStreak,
  } = useQuery({
    queryKey: queryKey.streaks.current(),
    queryFn: () => fetchStreak(authUser),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!authUser,
    retry: (failureCount, error) => {
      // 401 — не retry'им
      if ((error as any)?.status === 401) return false;
      return failureCount < 1;
    },
  });

  const {
    data: history = [],
    refetch: refetchHistory,
  } = useQuery({
    queryKey: queryKey.streaks.history(),
    queryFn: () => fetchStreakHistory(authUser),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!authUser,
    retry: (failureCount, error) => {
      if ((error as any)?.status === 401) return false;
      return failureCount < 1;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!authUser || !getBaseUrl()) return null;
      return apiPost<UserStreak>('/streaks/check-in', {});
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(queryKey.streaks.current(), result);
      }
    },
    onSettled: () => {
      invalidateStreaks(queryClient);
    },
  });

  const checkIn = useCallback(async () => {
    return checkInMutation.mutateAsync();
  }, [checkInMutation]);

  return {
    streak,
    history,
    loading,
    refetch: () => {
      refetchStreak();
      refetchHistory();
    },
    checkIn,
  };
};
