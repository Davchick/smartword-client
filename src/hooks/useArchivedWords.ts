/**
 * useArchivedWords — пагинированная загрузка архивных слов через useInfiniteQuery.
 *
 * Преимущества:
 * - Автоматическая дедупликация и кэширование (React Query v5)
 * - Background refetch при stale
 * - Offline поддержка: данные кэшируются в AsyncStorage
 * - Оптимистичные обновления при invalidate
 *
 * staleTime: 5 мин — данные редко меняются
 * gcTime: 15 мин — кэш живёт дольше, чем у стандартных запросов
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey } from '../lib/queryKeys';
import { ARCHIVE_THRESHOLD } from '../constants';

const PAGE_SIZE = 100;
const CACHE_KEY = 'smartword_archived_words_cache';

export interface ArchivedWord {
  id: string;
  group_id: string;
  original: string;
  translation: string;
  correct_count: number;
  last_reviewed: string | null;
  created_at: string;
}

interface ArchWordsResponse {
  words: ArchivedWord[];
  totalCount: number;
  hasNext: boolean;
  nextCursor: string | null;
}

interface CachedData {
  pages: ArchWordsResponse[];
  pageParams: (string | null)[];
  timestamp: number;
}

/**
 * Получить кэшированные данные из AsyncStorage (offline fallback).
 */
async function getCachedData(): Promise<CachedData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    // Кэш валиден 15 минут
    if (Date.now() - cached.timestamp > 15 * 60 * 1000) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

/**
 * Сохранить данные в AsyncStorage для offline.
 */
async function setCachedData(data: CachedData): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore — AsyncStorage full или ошибка
  }
}

/**
 * Guest mode: получить архивные слова из локального хранилища.
 */
async function getGuestArchivedWords(): Promise<{
  pages: ArchWordsResponse[];
  pageParams: (string | null)[];
}> {
  const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
  const allWords: ArchivedWord[] = wordsRaw ? JSON.parse(wordsRaw) : [];
  const archived = allWords.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD);
  return {
    pages: [
      {
        words: archived,
        totalCount: allWords.length,
        hasNext: false,
        nextCursor: null,
      },
    ],
    pageParams: [null],
  };
}

export const useArchivedWords = (searchQuery?: string) => {
  const { user: authUser } = useAuth();
  const isAuth = !!(authUser && getBaseUrl());

  const query = useInfiniteQuery({
    queryKey: queryKey.archivedWords.all,
    queryFn: async ({ pageParam }): Promise<ArchWordsResponse> => {
      const params = new URLSearchParams();
      params.set('archived', 'true');
      params.set('limit', String(PAGE_SIZE));
      if (pageParam) {
        params.set('cursor', pageParam as string);
      }
      if (searchQuery && searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      return apiGet<ArchWordsResponse>(`/words?${params.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextCursor : undefined),
    staleTime: 5 * 60 * 1000, // 5 мин
    gcTime: 15 * 60 * 1000, // 15 мин
    refetchOnWindowFocus: false,
    // Не запускать запрос для guest mode
    enabled: isAuth,
  });

  // Guest mode fallback
  const [guestWords, setGuestWords] = useState<ArchivedWord[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setGuestLoading(true);
      getGuestArchivedWords().then((r) => {
        setGuestWords(r.pages[0]?.words ?? []);
      }).finally(() => setGuestLoading(false));
    }
  }, [isAuth]);

  // Кэшируем результаты для offline после каждой успешной загрузки
  useEffect(() => {
    if (query.data && query.data.pages.length > 0) {
      setCachedData({
        pages: query.data.pages,
        pageParams: query.data.pageParams as (string | null)[],
        timestamp: Date.now(),
      });
    }
  }, [query.data]);

  // flatten all pages для удобного доступа
  const allWords = isAuth
    ? (query.data?.pages.flatMap((p) => p.words) ?? [])
    : guestWords;
  const totalCount = isAuth
    ? (query.data?.pages[0]?.totalCount ?? 0)
    : guestWords.length;
  const hasNext = isAuth ? (query.data ? ('hasNext' in query ? query.hasNext : false) : false) : false;

  return {
    words: allWords,
    totalCount,
    loading: (isAuth ? query.isLoading && !query.isFetching : guestLoading),
    refreshing: isAuth ? query.isRefetching : false,
    hasNext,
    loadMoreLoading: isAuth ? query.isFetchingNextPage : false,
    loadMore: isAuth ? query.fetchNextPage : async () => {},
    refetch: isAuth ? query.refetch : async () => {},
    // Для совместимости со старым API
    fetchInitial: isAuth ? query.refetch : async () => {},
    // React Query объект для продвинутого использования
    query,
  };
};
