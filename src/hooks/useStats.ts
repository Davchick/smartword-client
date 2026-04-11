/**
 * useStats — React Query версия.
 *
 * Ключевые изменения:
 * - totalWords и learnedWords читаются из React Query кэша слов (['words']) — мгновенно, без запроса
 * - currentStreak, weekActivity — вычисляются на основе кэша слов (guest) или серверные (auth)
 * - Guest mode больше не читает AsyncStorage напрямую — подписан на кэш слов через React Query
 * - Автоматическое обновление при любых изменениях кэша слов
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';
import { ARCHIVE_THRESHOLD } from '../constants';
import type { WordsResponse, Word } from '../hooks/useWords';
import { getGuestWords } from '../lib/guestStorage';

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Вычисляет статистику на основе массива слов.
 */
function computeStatsFromWords(words: Word[]): Omit<Stats, 'totalWords' | 'learnedWords'> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const activeDays = new Set<string>();
  for (const w of words) {
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

  return { currentStreak: streak, weekActivity };
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

  // Для авторизованного пользователя: читаем кэш слов
  const { data: wordsCache } = useQuery({
    queryKey: queryKey.words.list(),
    queryFn: () => apiGet<WordsResponse>('/words'),
    enabled: !!authUser,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    select: (data) => data,
  });

  // Для guest mode: используем ОТДЕЛЬНЫЙ queryKey от useWords
  // Это предотвращает конфликт при optimistic updates
  const { data: guestWordsData } = useQuery({
    queryKey: queryKey.stats.guestWords(),
    queryFn: async () => {
      const words = await getGuestWords<Word[]>();
      const wordsArray = words ?? [];
      return { words: wordsArray, totalCount: wordsArray.length };
    },
    enabled: !authUser,
    staleTime: 1000, // 1 сек — избегаем слишком частых refetch'ей
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false, // Не refetch'им при каждом маунте
  });

  // Серверная статистика для streak и weekActivity
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

  // Определяем активный набор слов
  const activeCache = authUser ? wordsCache : guestWordsData;
  const activeWords = activeCache?.words ?? [];
  const totalWords = activeCache?.totalCount ?? 0;
  const learnedWords = activeWords.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD).length;

  // Вычисляем streak и weekActivity
  const cacheStats = useMemo(() => computeStatsFromWords(activeWords), [activeWords]);

  const stats: Stats = useMemo(() => {
    if (authUser) {
      // Для авторизованных: streak и weekActivity с сервера
      return {
        totalWords,
        learnedWords,
        currentStreak: serverStats?.currentStreak ?? cacheStats.currentStreak,
        weekActivity: serverStats?.weekActivity ?? cacheStats.weekActivity,
      };
    }

    // Для guest: всё из кэша
    return {
      totalWords,
      learnedWords,
      currentStreak: cacheStats.currentStreak,
      weekActivity: cacheStats.weekActivity,
    };
  }, [authUser, totalWords, learnedWords, cacheStats, serverStats]);

  const loading = authUser ? serverLoading : (guestWordsData === undefined);

  return {
    stats,
    loading,
    refetch: async () => {
      if (authUser) {
        await queryClient.refetchQueries({ queryKey: queryKey.stats.overview() });
        await queryClient.refetchQueries({ queryKey: queryKey.words.list() });
      } else {
        // В guest mode инвалидируем guest words — queryFn перечитает AsyncStorage
        await queryClient.invalidateQueries({ queryKey: queryKey.stats.guestWords() });
      }
    },
  };
};
