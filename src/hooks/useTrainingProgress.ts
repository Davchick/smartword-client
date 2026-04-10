/**
 * useTrainingProgress — React Query версия.
 *
 * - useQuery для загрузки прогресса тренировок
 * - useMutation для addPoints — без optimistic update (сервер — источник правды)
 * - invalidateQueries обновляет после мутаций
 * - Для пользователей без аккаунта — данные из AsyncStorage
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrainingDayProgress {
  date: string;
  dayLabel: string;
  points: number;
  isToday: boolean;
}

const LOCAL_STORAGE_KEY = '@local_training_progress';
const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

async function fetchTrainingProgress(
  authUser: ReturnType<typeof useAuth>['user']
): Promise<TrainingDayProgress[]> {
  if (!authUser || !getBaseUrl()) return [];
  return apiGet<TrainingDayProgress[]>('/stats/training-progress');
}

async function getLocalProgress(): Promise<TrainingDayProgress[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Инициализируем пустую неделю
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay(); // 0=Вс
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Понедельник

  const data: TrainingDayProgress[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    data.push({
      date: date.toISOString(),
      dayLabel: DAY_NAMES[date.getDay()!]!,
      points: 0,
      isToday: date.toDateString() === now.toDateString(),
    });
  }
  return data;
}

async function addLocalPoints(points: number): Promise<void> {
  try {
    const data = await getLocalProgress();
    const today = new Date().toDateString();

    let todayEntry = data.find(d => new Date(d.date).toDateString() === today);
    if (todayEntry) {
      todayEntry.points += points;
    } else {
      const now = new Date();
      data.push({
        date: now.toISOString(),
        dayLabel: DAY_NAMES[now.getDay()!]!,
        points,
        isToday: true,
      });
    }

    // Оставляем только последние 7 дней, сортируя по дате (от старых к новым)
    const sorted = data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);

    await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch {}
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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!authUser,
  });

  // Для пользователей без аккаунта — загружаем из AsyncStorage
  // staleTime: 30s — достаточно чтобы не re-render'ить постоянно,
  // но данные обновятся через setQueryData из flushSession
  const { data: localProgress, refetch: refetchLocal } = useQuery({
    queryKey: ['local_training_progress'],
    queryFn: getLocalProgress,
    staleTime: 30 * 1000,
    enabled: !authUser,
  });

  const addPointsMutation = useMutation({
    mutationFn: async (points: number) => {
      if (!authUser || !getBaseUrl() || points <= 0) return;
      await apiPost('/stats/training-progress', { points });
    },
    onError: (e) => {
      if (__DEV__) console.warn('[useTrainingProgress] addPoints error:', e);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKey.stats.trainingProgress() });
    },
  });

  const addLocalPointsMutation = useMutation({
    mutationFn: addLocalPoints,
    onSettled: () => {
      refetchLocal();
    },
  });

  const addPoints = useCallback(
    (points: number) => {
      if (authUser && getBaseUrl()) {
        addPointsMutation.mutate(points);
      } else {
        addLocalPointsMutation.mutate(points);
      }
    },
    [authUser, addPointsMutation, addLocalPointsMutation]
  );

  const finalProgress = authUser ? progress : (localProgress || []);

  return { progress: finalProgress, loading: loading && !!authUser, refetch: () => authUser ? refetch() : refetchLocal(), addPoints };
};
