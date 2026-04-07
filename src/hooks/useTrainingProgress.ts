/**
 * useTrainingProgress — React Query версия.
 *
 * - useQuery для загрузки прогресса тренировок
 * - useMutation для addPoints — без optimistic update (сервер — источник правды)
 * - invalidateQueries обновляет после мутаций
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';

export interface TrainingDayProgress {
  date: string;
  dayLabel: string;
  points: number;
  isToday: boolean;
}

async function fetchTrainingProgress(
  authUser: ReturnType<typeof useAuth>['user']
): Promise<TrainingDayProgress[]> {
  if (!authUser || !getBaseUrl()) return [];
  return apiGet<TrainingDayProgress[]>('/stats/training-progress');
}

export const useTrainingProgress = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: progress = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKey.stats.trainingProgress(),
    queryFn: () => fetchTrainingProgress(authUser),
    staleTime: 2 * 60 * 1000, // 2 мин
    gcTime: 5 * 60 * 1000,
    enabled: !!authUser,
  });

  const addPointsMutation = useMutation({
    mutationFn: async (points: number) => {
      if (!authUser || !getBaseUrl() || points <= 0) return;
      await apiPost('/stats/training-progress', { points });
    },
    // НЕ делаем optimistic update — очки считаются на сервере.
    // При ошибке — не блокируем UI, данные обновятся при refetch.
    onError: (e) => {
      if (__DEV__) console.warn('[useTrainingProgress] addPoints error:', e);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKey.stats.trainingProgress() });
    },
  });

  const addPoints = useCallback(
    (points: number) => {
      addPointsMutation.mutate(points);
    },
    [addPointsMutation]
  );

  return { progress, loading, refetch: () => refetch(), addPoints };
};
