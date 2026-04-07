/**
 * useStreak — React Query версия.
 *
 * - Один query для streak + history (через /streaks/summary) — экономия 1 запроса
 * - useMutation для checkIn
 * - invalidateStreaks после мутаций
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateStreaks } from '../lib/queryKeys';
import { UserStreak, StreakHistory } from '../types/achievements';

interface StreakSummary {
  streak: UserStreak;
  history: StreakHistory[];
}

async function fetchStreakSummary(authUser: ReturnType<typeof useAuth>['user']): Promise<StreakSummary | null> {
  if (!authUser || !getBaseUrl()) return null;
  return apiGet<StreakSummary>('/streaks/summary');
}

export const useStreak = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: summary = null,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKey.streaks.current(), // переиспользуем тот же ключ
    queryFn: () => fetchStreakSummary(authUser),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!authUser,
    retry: (failureCount, error) => {
      // 401 — не retry'им
      if ((error as any)?.status === 401) return false;
      return failureCount < 1;
    },
  });

  const streak = summary?.streak ?? null;
  const history = summary?.history ?? [];

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!authUser || !getBaseUrl()) return null;
      return apiPost<UserStreak>('/streaks/check-in', {});
    },
    onSuccess: (result) => {
      if (result) {
        // Обновляем локальный кэш
        queryClient.setQueryData(queryKey.streaks.current(), (prev: StreakSummary | null) => {
          if (!prev) return prev;
          return { ...prev, streak: result };
        });
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
    refetch: () => refetch(),
    checkIn,
  };
};
