/**
 * useWords — React Query версия.
 *
 * Ключевые изменения:
 * - useQuery для загрузки слов — кэш, дедупликация, background refetch
 * - useMutation для add/delete/update/progress — с optimistic updates
 * - invalidateQueries автоматически обновляет все экраны
 * - Guest mode через queryFn с AsyncStorage
 * - pendingUpdatesRef сохранён — предотвращает перезапись stale-данными
 *   при race condition между optimistic update и ответом сервера
 */

import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateWords } from '../lib/queryKeys';
import { ARCHIVE_THRESHOLD } from '../constants';

export interface Word {
  id: string;
  group_id: string;
  user_id: string;
  original: string;
  translation: string;
  correct_count: number;
  last_reviewed: string | null;
  created_at: string;
}

interface WordsResponse {
  words: Word[];
  totalCount: number;
}

interface UseWordsOptions {
  /** Запрашивать только указанные поля. Экономит трафик. */
  fields?: string[];
  /** Максимальное число слов (по умолчанию 200, максимум 500). */
  limit?: number;
}

// ─── Guest mode helpers ────────────────────────────────────────────────

async function getGuestWords(): Promise<Word[]> {
  const raw = await AsyncStorage.getItem('smartword_guest_words');
  return raw ? JSON.parse(raw) : [];
}

async function setGuestWords(words: Word[]): Promise<void> {
  await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(words));
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ─── Query function ────────────────────────────────────────────────────

async function fetchWordsQuery(
  authUser: ReturnType<typeof useAuth>['user'],
  groupId?: string,
  options?: UseWordsOptions
): Promise<WordsResponse> {
  if (authUser && getBaseUrl()) {
    const params = new URLSearchParams();
    if (groupId) params.set('groupId', groupId);
    if (options?.fields) params.set('fields', options.fields.join(','));
    if (options?.limit) params.set('limit', String(options.limit));
    const path = params.toString() ? `/words?${params.toString()}` : '/words';
    const data = await apiGet<WordsResponse | Word[]>(path);
    if (Array.isArray(data)) {
      return { words: data as unknown as Word[], totalCount: data.length };
    }
    return { words: data?.words ?? [], totalCount: data?.totalCount ?? data?.words?.length ?? 0 };
  }

  // Guest mode
  const allWords = await getGuestWords();
  const filtered = groupId ? allWords.filter((w) => w.group_id === groupId) : allWords;
  return { words: filtered, totalCount: allWords.length };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export const useWords = (groupId?: string, options?: UseWordsOptions) => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Ref для pending optimistic updates — fetchWords не перезапишет их
  const pendingUpdatesRef = useRef<Map<string, { correct_count: number; last_reviewed: string }>>(
    new Map()
  );

  // ─── Query ─────────────────────────────────────────────────────────

  const {
    data: wordsData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKey.words.list(groupId, options?.fields?.join(',')),
    queryFn: () => fetchWordsQuery(authUser, groupId, options),
    // Слова — часто меняющиеся данные. Refetch при фокусе экрана — ок.
    staleTime: 30 * 1000, // 30 сек — не refetch'им слишком часто
    gcTime: 5 * 60 * 1000, // 5 мин
    enabled: true,
  });

  const words = wordsData?.words ?? [];
  const totalCount = wordsData?.totalCount ?? 0;

  // Helper: применяет pending оптимистичные обновления поверх серверных данных
  const applyPendingUpdates = useCallback((serverWords: Word[]): Word[] => {
    if (pendingUpdatesRef.current.size === 0) return serverWords;
    return serverWords.map((w) => {
      const pending = pendingUpdatesRef.current.get(w.id);
      return pending
        ? { ...w, correct_count: pending.correct_count, last_reviewed: pending.last_reviewed }
        : w;
    });
  }, []);

  // Если есть pending updates — применяем их к данным из кэша
  const hasPending = pendingUpdatesRef.current.size > 0;
  const effectiveWords = hasPending ? applyPendingUpdates(words) : words;

  // ─── Mutations ─────────────────────────────────────────────────────

  /**
   * Добавить слово.
   * Optimistic update: сразу добавляем в кэш, rollback при ошибке.
   */
  const addWordMutation = useMutation({
    mutationFn: async ({
      original,
      translation,
      groupId: gId,
    }: {
      original: string;
      translation: string;
      groupId: string;
    }) => {
      if (authUser && getBaseUrl()) {
        return apiPost<Word>('/words', { original, translation, group_id: gId });
      }
      // Guest mode
      const existing = await getGuestWords();
      const newWord: Word = {
        id: generateGuestId(),
        group_id: gId,
        user_id: 'guest',
        original,
        translation,
        correct_count: 0,
        last_reviewed: null,
        created_at: new Date().toISOString(),
      };
      await setGuestWords([newWord, ...existing]);
      return newWord;
    },
    onMutate: async ({ original, translation, groupId: gId }) => {
      const qKey = queryKey.words.list(groupId);
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<WordsResponse>(qKey);

      const optimisticWord: Word = {
        id: generateGuestId(),
        group_id: gId,
        user_id: authUser?.id ?? 'guest',
        original,
        translation,
        correct_count: 0,
        last_reviewed: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(qKey, (old: WordsResponse | undefined) => ({
        words: old ? [optimisticWord, ...old.words] : [optimisticWord],
        totalCount: (old?.totalCount ?? 0) + 1,
      }));

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey.words.list(groupId), ctx.previous);
      }
    },
    onSettled: () => {
      invalidateWords(queryClient);
    },
  });

  /**
   * Удалить слово.
   * Optimistic update: сразу удаляем из кэша.
   */
  const deleteWordMutation = useMutation({
    mutationFn: async (wordId: string) => {
      if (authUser && getBaseUrl()) {
        return apiDelete(`/words/${wordId}`);
      }
      // Guest mode
      const existing = await getGuestWords();
      await setGuestWords(existing.filter((w) => w.id !== wordId));
    },
    onMutate: async (wordId) => {
      pendingUpdatesRef.current.delete(wordId); // очищаем pending для удаляемого слова

      const qKey = queryKey.words.list(groupId);
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<WordsResponse>(qKey);

      queryClient.setQueryData(qKey, (old: WordsResponse | undefined) => ({
        words: old?.words.filter((w) => w.id !== wordId) ?? [],
        totalCount: Math.max(0, (old?.totalCount ?? 1) - 1),
      }));

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey.words.list(groupId), ctx.previous);
      }
    },
    onSettled: () => {
      invalidateWords(queryClient);
    },
  });

  /**
   * Обновить слово (original, translation).
   */
  const updateWordMutation = useMutation({
    mutationFn: async ({
      wordId,
      original,
      translation,
    }: {
      wordId: string;
      original: string;
      translation: string;
    }) => {
      if (authUser && getBaseUrl()) {
        return apiPatch<Word>(`/words/${wordId}`, { original, translation });
      }
      // Guest mode
      const existing = await getGuestWords();
      const updated = existing.map((w) =>
        w.id === wordId ? { ...w, original, translation } : w
      );
      await setGuestWords(updated);
      return updated.find((w) => w.id === wordId);
    },
    onSettled: () => {
      invalidateWords(queryClient);
    },
  });

  /**
   * Обновить прогресс слова (тренировка).
   * Оптимистичное обновление + rollback при WEEKLY_LIMIT_REACHED.
   */
  const updateProgressMutation = useMutation({
    mutationFn: async ({
      wordId,
      knew,
      correctDelta = 1,
      incorrectDelta = -1,
      offline = false,
    }: {
      wordId: string;
      knew: boolean;
      correctDelta?: number;
      incorrectDelta?: number;
      offline?: boolean;
    }) => {
      if (offline) {
        // Offline — только локальное обновление
        return { offline: true };
      }

      if (authUser && getBaseUrl()) {
        return apiPost(`/words/${wordId}/progress`, { knew, correctDelta, incorrectDelta });
      }

      // Guest mode — обновляем AsyncStorage
      const existing = await getGuestWords();
      const word = existing.find((w) => w.id === wordId);
      if (!word) return { guestNoWord: true };

      const delta = knew ? correctDelta : incorrectDelta;
      const newCount = Math.max(0, word.correct_count + delta);
      const updated = existing.map((w) =>
        w.id === wordId
          ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() }
          : w
      );
      await setGuestWords(updated);
      return { guestUpdated: true, newCorrectCount: newCount };
    },
    onMutate: async ({ wordId, knew, correctDelta = 1, incorrectDelta = -1 }) => {
      const qKey = queryKey.words.list(groupId);
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<WordsResponse>(qKey);

      const word = words.find((w) => w.id === wordId);
      if (!word) return { previous };

      const delta = knew ? correctDelta : incorrectDelta;
      const newCount = Math.max(0, word.correct_count + delta);
      const nowIso = new Date().toISOString();

      // Оптимистичное обновление кэша
      queryClient.setQueryData(qKey, (old: WordsResponse | undefined) => ({
        words: old?.words.map((w) =>
          w.id === wordId ? { ...w, correct_count: newCount, last_reviewed: nowIso } : w
        ) ?? [],
        totalCount: old?.totalCount ?? 0,
      }));

      // Регистрируем pending — fetchWords не перезапишет
      pendingUpdatesRef.current.set(wordId, {
        correct_count: newCount,
        last_reviewed: nowIso,
      });

      return { previous, wordId, knew, oldCount: word.correct_count };
    },
    onError: (err: any, vars, ctx) => {
      // WEEKLY_LIMIT_REACHED — полный rollback
      if (err?.body?.error === 'WEEKLY_LIMIT_REACHED') {
        pendingUpdatesRef.current.delete(vars.wordId);
        const qKey = queryKey.words.list(groupId);
        queryClient.setQueryData(qKey, (old: WordsResponse | undefined) => ({
          words: old?.words.map((w) =>
            w.id === vars.wordId
              ? { ...w, correct_count: ctx?.oldCount ?? w.correct_count, last_reviewed: w.last_reviewed }
              : w
          ) ?? [],
          totalCount: old?.totalCount ?? 0,
        }));
        return;
      }

      // Другие ошибки — rollback из previous
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey.words.list(groupId), ctx.previous);
      }
      pendingUpdatesRef.current.delete(vars.wordId);
    },
    onSuccess: (data, vars) => {
      // Сервер подтвердил — удаляем из pending
      pendingUpdatesRef.current.delete(vars.wordId);
    },
  });

  // ─── Computed ──────────────────────────────────────────────────────

  const archivedWords = effectiveWords.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD);

  const getTrainingWords = useCallback((): Word[] => {
    return [...effectiveWords]
      .filter((w) => w.correct_count < ARCHIVE_THRESHOLD)
      .sort((a, b) => {
        if (a.correct_count !== b.correct_count) return a.correct_count - b.correct_count;
        const dateA = a.last_reviewed ? new Date(a.last_reviewed).getTime() : 0;
        const dateB = b.last_reviewed ? new Date(b.last_reviewed).getTime() : 0;
        return dateA - dateB;
      });
  }, [effectiveWords]);

  // ─── Return ────────────────────────────────────────────────────────

  return {
    words: effectiveWords,
    archivedWords,
    loading,
    totalCount,
    addWord: async (original: string, translation: string, gId: string) => {
      try {
        await addWordMutation.mutateAsync({ original, translation, groupId: gId });
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось добавить слово' };
      }
    },
    deleteWord: async (wordId: string) => {
      try {
        await deleteWordMutation.mutateAsync(wordId);
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось удалить слово' };
      }
    },
    updateWord: async (wordId: string, original: string, translation: string) => {
      try {
        await updateWordMutation.mutateAsync({ wordId, original, translation });
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось обновить слово' };
      }
    },
    updateWordProgress: async (
      wordId: string,
      knew: boolean,
      options?: { correctDelta?: number; incorrectDelta?: number; offline?: boolean }
    ) => {
      try {
        const result = await updateProgressMutation.mutateAsync({
          wordId,
          knew,
          correctDelta: options?.correctDelta ?? 1,
          incorrectDelta: options?.incorrectDelta ?? -1,
          offline: options?.offline,
        });

        if (result && typeof result === 'object' && 'correct_count' in result) {
          const serverCount = (result as { correct_count: number }).correct_count;
          const limitReached = (result as { limit_reached?: boolean }).limit_reached;
          const wordsLearned = (result as { words_learned_this_week?: number }).words_learned_this_week;
          return {
            success: true,
            newCorrectCount: serverCount,
            weeklyLimitReached: false,
            limitReached,
            wordsLearnedThisWeek: wordsLearned,
          };
        }

        return { success: true, newCorrectCount: (result as any)?.newCorrectCount };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string; words_learned_this_week?: number } };
        if (e?.body?.error === 'WEEKLY_LIMIT_REACHED') {
          return {
            success: false,
            weeklyLimitReached: true,
            wordsLearnedThisWeek: e.body.words_learned_this_week,
          };
        }
        return { success: false };
      }
    },
    getTrainingWords,
    refetch: () => refetch(),
  };
};
