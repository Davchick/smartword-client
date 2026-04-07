/**
 * useAchievements — React Query версия.
 *
 * - Два параллельных query: список достижений + summary
 * - useMutation для checkAchievements
 * - invalidateAchievements после мутаций
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateAchievements } from '../lib/queryKeys';
import { Achievement, AchievementsSummary } from '../types/achievements';

async function fetchAchievements(authUser: ReturnType<typeof useAuth>['user']): Promise<Achievement[]> {
  if (!authUser || !getBaseUrl()) return [];
  return apiGet<Achievement[]>('/achievements');
}

async function fetchAchievementsSummary(authUser: ReturnType<typeof useAuth>['user']): Promise<AchievementsSummary | null> {
  if (!authUser || !getBaseUrl()) return null;
  return apiGet<AchievementsSummary>('/achievements/summary');
}

export const useAchievements = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: achievements = [],
    isLoading: loading,
    refetch: refetchAchievements,
  } = useQuery({
    queryKey: queryKey.achievements.list(),
    queryFn: () => fetchAchievements(authUser),
    staleTime: 2 * 60 * 1000, // 2 мин — достижения меняются редко
    gcTime: 10 * 60 * 1000,
    enabled: !!authUser,
  });

  const {
    data: summary = null,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKey.achievements.summary(),
    queryFn: () => fetchAchievementsSummary(authUser),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!authUser,
  });

  const checkMutation = useMutation({
    mutationFn: async ({ action, value }: { action: string; value: number }) => {
      if (!authUser || !getBaseUrl()) return { unlocked: [] };
      return apiPost<{ unlocked: Achievement[] }>('/achievements/check', { action, value });
    },
    onSuccess: (result) => {
      if (result.unlocked && result.unlocked.length > 0) {
        // Обновляем локальный кэш — отмечаем разблокированные
        queryClient.setQueryData(queryKey.achievements.list(), (prev: Achievement[] | undefined) =>
          prev?.map((a) => {
            const unlocked = result.unlocked.find((u) => u.id === a.id);
            if (unlocked) {
              return { ...a, unlocked: true, unlockedAt: new Date().toISOString() };
            }
            return a;
          }) ?? []
        );
      }
    },
    onSettled: () => {
      invalidateAchievements(queryClient);
    },
  });

  const checkAchievements = useCallback(
    async (action: string, value: number) => {
      const result = await checkMutation.mutateAsync({ action, value });
      return result.unlocked || [];
    },
    [checkMutation]
  );

  return {
    achievements,
    summary,
    loading,
    refetch: () => {
      refetchAchievements();
      refetchSummary();
    },
    checkAchievements,
  };
};
