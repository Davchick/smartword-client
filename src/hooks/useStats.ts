/**
 * useStats — React Query версия.
 *
 * - useQuery для загрузки статистики
 * - Guest mode через computeGuestStats (без изменений)
 * - invalidateQueries обновляет после мутаций
 */

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';

export interface DayActivity {
  date: string;
  dayLabel: string;
  hasActivity: boolean;
  isFuture: boolean;
  isToday: boolean;
}

export interface Stats {
  totalWords: number;
  learnedWords: number;
  currentStreak: number;
  weekActivity: DayActivity[];
}

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

async function computeGuestStats(): Promise<Stats> {
  const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
  const allWords: { correct_count: number; last_reviewed: string | null }[] = wordsRaw
    ? JSON.parse(wordsRaw)
    : [];
  const totalWords = allWords.length;
  const learnedWords = allWords.filter((w) => w.correct_count >= 5).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const activeDays = new Set<string>();
  for (const w of allWords) {
    if (w.last_reviewed) {
      const d = new Date(w.last_reviewed);
      d.setHours(0, 0, 0, 0);
      activeDays.add(toDateStr(d));
    }
  }

  const weekActivity: DayActivity[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateStr = toDateStr(day);
    const todayStr = toDateStr(today);
    weekActivity.push({
      date: dateStr,
      dayLabel: DAY_LABELS[day.getDay()] as string,
      hasActivity: activeDays.has(dateStr),
      isFuture: day > today,
      isToday: dateStr === todayStr,
    });
  }

  let streak = 0;
  const cursor = new Date(today);
  while (streak < 365) {
    const dateStr = toDateStr(cursor);
    if (activeDays.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  return { totalWords, learnedWords, currentStreak: streak, weekActivity };
}

async function fetchStatsQuery(authUser: ReturnType<typeof useAuth>['user']): Promise<Stats> {
  if (authUser && getBaseUrl()) {
    return apiGet<Stats>('/stats');
  }
  return computeGuestStats();
}

const EMPTY_STATS: Stats = {
  totalWords: 0,
  learnedWords: 0,
  currentStreak: 0,
  weekActivity: [],
};

export const useStats = () => {
  const { user: authUser } = useAuth();

  const {
    data: stats = EMPTY_STATS,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKey.stats.overview(),
    queryFn: () => fetchStatsQuery(authUser),
    staleTime: 60 * 1000, // 1 мин
    gcTime: 5 * 60 * 1000,
  });

  return {
    stats,
    loading,
    refetch: () => refetch(),
  };
};
