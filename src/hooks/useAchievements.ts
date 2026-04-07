/**
 * useAchievements — React Query версия.
 *
 * - Один query для achievements + summary (через /achievements/all) — экономия 1 запроса
 * - useMutation для checkAchievements
 * - invalidateAchievements после мутаций
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateAchievements } from '../lib/queryKeys';
import { Achievement, AchievementsSummary } from '../types/achievements';

interface AchievementsAll {
  achievements: Achievement[];
  summary: AchievementsSummary;
}

async function fetchAchievementsAll(authUser: ReturnType<typeof useAuth>['user']): Promise<AchievementsAll | null> {
  if (!authUser || !getBaseUrl()) return null;
  return apiGet<AchievementsAll>('/achievements/all');
}

export const useAchievements = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: allData = null,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKey.achievements.list(), // переиспользуем тот же ключ
    queryFn: () => fetchAchievementsAll(authUser),
    staleTime: 2 * 60 * 1000, // 2 мин — достижения меняются редко
    gcTime: 10 * 60 * 1000,
    enabled: !!authUser,
  });

  const achievements = allData?.achievements ?? [];
  const summary = allData?.summary ?? null;

  const checkMutation = useMutation({
    mutationFn: async ({ action, value }: { action: string; value: number }) => {
      if (!authUser || !getBaseUrl()) return { unlocked: [] };
      return apiPost<{ unlocked: Achievement[] }>('/achievements/check', { action, value });
    },
    onSuccess: (result) => {
      if (result.unlocked && result.unlocked.length > 0) {
        // Обновляем локальный кэш — отмечаем разблокированные
        queryClient.setQueryData(queryKey.achievements.list(), (prev: AchievementsAll | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            achievements: prev.achievements.map((a) => {
              const unlocked = result.unlocked.find((u) => u.id === a.id);
              if (unlocked) {
                return { ...a, unlocked: true, unlockedAt: new Date().toISOString() };
              }
              return a;
            }),
          };
        });
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
    refetch: () => refetch(),
    checkAchievements,
  };
};
