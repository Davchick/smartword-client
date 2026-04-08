/**
 * useStats — React Query версия.
 *
 * Ключевые изменения:
 * - totalWords читается из React Query кэша слов (['words']) — мгновенно, без запроса
 * - learnedWords, currentStreak, weekActivity — серверные (сложная логика)
 * - Guest mode через computeGuestStats (без изменений)
 * - Fallback на серверный totalWords если кэш слов ещё не загружен
 */

import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';
import { ARCHIVE_THRESHOLD } from '../constants';
import type { WordsResponse } from '../hooks/useWords';

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
  const learnedWords = allWords.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD).length;

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

interface ServerStats {
  learnedWords: number;
  currentStreak: number;
  weekActivity: DayActivity[];
}

async function fetchServerStats(): Promise<ServerStats | null> {
  if (getBaseUrl()) {
    return apiGet<ServerStats>('/stats');
  }
  return null;
}

const EMPTY_STATS: Stats = {
  totalWords: 0,
  learnedWords: 0,
  currentStreak: 0,
  weekActivity: [],
};

export const useStats = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Для guest mode — всё вычисляем локально (без изменений)
  const {
    data: guestStats,
    isLoading: guestLoading,
  } = useQuery({
    queryKey: queryKey.stats.overview(),
    queryFn: computeGuestStats,
    enabled: !authUser,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Для авторизованного пользователя:
  // - totalWords из кэша слов (мгновенно, обновляется при мутациях)
  // - learnedWords, currentStreak, weekActivity — серверные
  const {
    data: serverStats,
    isLoading: serverLoading,
  } = useQuery({
    queryKey: queryKey.stats.overview(),
    queryFn: fetchServerStats,
    enabled: !!authUser,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Подписываемся на общий кэш слов через useQuery — это даст re-render при обновлении кэша
  // Если кэш уже заполнен (через useWords или мутации) — запрос не делается (deduplication)
  // Если кэша нет — делаем один запрос чтобы заполнить его
  const { data: wordsCache } = useQuery({
    queryKey: queryKey.words.list(),
    queryFn: () => apiGet<WordsResponse>('/words'),
    enabled: !!authUser,
    staleTime: 30 * 1000, // 30 сек — синхронизировано с useWords
    gcTime: 5 * 60 * 1000,
    select: (data) => data,
  });

  const cachedTotalWords = wordsCache?.totalCount ?? 0;
  // Fallback: если кэша слов нет — используем 0 (запрос придёт и обновит)
  const totalWords = wordsCache ? cachedTotalWords : (serverStats as any)?.totalWords ?? 0;

  const stats: Stats = useMemo(() => {
    if (!authUser) {
      return guestStats ?? EMPTY_STATS;
    }

    return {
      totalWords,
      learnedWords: serverStats?.learnedWords ?? 0,
      currentStreak: serverStats?.currentStreak ?? 0,
      weekActivity: serverStats?.weekActivity ?? [],
    };
  }, [authUser, guestStats, totalWords, serverStats]);

  const loading = authUser ? serverLoading : guestLoading;

  return {
    stats,
    loading,
    refetch: async () => {
      if (authUser) {
        await queryClient.refetchQueries({ queryKey: queryKey.stats.overview() });
        // Также рефетчим кэш слов чтобы обновить totalWords
        await queryClient.refetchQueries({ queryKey: queryKey.words.list() });
      } else {
        await queryClient.refetchQueries({ queryKey: queryKey.stats.overview() });
      }
    },
  };
};
