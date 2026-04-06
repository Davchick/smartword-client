import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiPatch, apiDelete, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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

export const useWords = (groupId?: string) => {
  const { user: authUser } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      if (authUser && getBaseUrl()) {
        const path = groupId ? `/words?groupId=${encodeURIComponent(groupId)}` : '/words';
        const data = await apiGet<Word[]>(path);
        setWords(data ?? []);
        if (!groupId) {
          setTotalCount(data?.length ?? 0);
        } else {
          const all = await apiGet<Word[]>('/words');
          setTotalCount(all?.length ?? 0);
        }
        return;
      }
      const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
      const allWords: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
      const filtered = groupId ? allWords.filter((w) => w.group_id === groupId) : allWords;
      setWords(filtered);
      setTotalCount(allWords.length);
    } catch (e) {
      console.warn('[useWords] fetchWords error', e);
      setWords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [groupId, authUser]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const addWord = async (original: string, translation: string, gId: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        const created = await apiPost<Word>('/words', { original, translation, group_id: gId });
        await fetchWords(); // Полностью обновляем список слов
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось добавить слово' };
      }
    }
    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const newWord: Word = {
      id: `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      group_id: gId,
      user_id: 'guest',
      original,
      translation,
      correct_count: 0,
      last_reviewed: null,
      created_at: new Date().toISOString(),
    };
    const updated = [newWord, ...existing];
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    await fetchWords(); // Полностью обновляем список слов
    return { error: null };
  };

  const deleteWord = async (wordId: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiDelete(`/words/${wordId}`);
        await fetchWords(); // Полностью обновляем список слов
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось удалить слово' };
      }
    }
    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const updated = existing.filter((w) => w.id !== wordId);
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    await fetchWords(); // Полностью обновляем список слов
    return { error: null };
  };

  const updateWordProgress = async (
    wordId: string,
    knew: boolean,
    options?: { correctDelta?: number; incorrectDelta?: number }
  ): Promise<{ success: boolean; weeklyLimitReached?: boolean; wordsLearnedThisWeek?: number; newCorrectCount?: number; limitReached?: boolean }> => {
    const word = words.find((w) => w.id === wordId);
    if (!word) return { success: false };
    const correctDelta = options?.correctDelta ?? 1;
    const incorrectDelta = options?.incorrectDelta ?? -1;
    const delta = knew ? correctDelta : incorrectDelta;
    const newCount = Math.max(0, word.correct_count + delta);

    console.log('[useWords] updateWordProgress:', { wordId, knew, delta, oldCount: word.correct_count, newCount });

    // Сначала обновляем локальное состояние (оптимистичное обновление)
    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() } : w
      )
    );
    console.log('[useWords] Local state updated');

    if (authUser && getBaseUrl()) {
      try {
        const response = await apiPost(`/words/${wordId}/progress`, { knew, correctDelta, incorrectDelta });
        console.log('[useWords] API response:', response);
        
        // Если сервер вернул обновлённые данные, используем их
        if (response && typeof response === 'object' && 'correct_count' in response) {
          const serverCount = (response as { correct_count: number }).correct_count;
          const serverLastReviewed = (response as { last_reviewed?: string }).last_reviewed;
          const limitReached = (response as { limit_reached?: boolean }).limit_reached;
          const wordsLearned = (response as { words_learned_this_week?: number }).words_learned_this_week;
          
          setWords((prev) =>
            prev.map((w) =>
              w.id === wordId ? { ...w, correct_count: serverCount, last_reviewed: serverLastReviewed || w.last_reviewed } : w
            )
          );
          console.log('[useWords] Updated from server:', { serverCount, limitReached, wordsLearned });
          return { 
            success: true, 
            newCorrectCount: serverCount,
            weeklyLimitReached: false,
            limitReached: limitReached,
            wordsLearnedThisWeek: wordsLearned,
          };
        }
      } catch (err: unknown) {
        const e = err as { body?: { error?: string; words_learned_this_week?: number } };
        if (e?.body?.error === 'WEEKLY_LIMIT_REACHED') {
          console.log('[useWords] Weekly limit reached!');
          // Откатываем локальное изменение
          setWords((prev) =>
            prev.map((w) =>
              w.id === wordId ? { ...w, correct_count: word.correct_count, last_reviewed: w.last_reviewed } : w
            )
          );
          return {
            success: false,
            weeklyLimitReached: true,
            wordsLearnedThisWeek: e.body.words_learned_this_week,
          };
        }
        console.error('[useWords] API error:', err);
      }
    } else {
      const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
      const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
      const updated = existing.map((w) =>
        w.id === wordId ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() } : w
      );
      await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    }
    
    return { success: true, newCorrectCount: newCount };
  };

  const updateWord = async (wordId: string, original: string, translation: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiPatch<Word>(`/words/${wordId}`, { original, translation });
        await fetchWords(); // Полностью обновляем список слов
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось обновить слово' };
      }
    }
    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const updated = existing.map((w) => (w.id === wordId ? { ...w, original, translation } : w));
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    await fetchWords(); // Полностью обновляем список слов
    return { error: null };
  };

  const ARCHIVE_THRESHOLD = 5;
  const getTrainingWords = useCallback((): Word[] => {
    return [...words]
      .filter((w) => w.correct_count < ARCHIVE_THRESHOLD)
      .sort((a, b) => {
        if (a.correct_count !== b.correct_count) return a.correct_count - b.correct_count;
        const dateA = a.last_reviewed ? new Date(a.last_reviewed).getTime() : 0;
        const dateB = b.last_reviewed ? new Date(b.last_reviewed).getTime() : 0;
        return dateA - dateB;
      });
  }, [words]);
  const archivedWords = words.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD);

  return {
    words,
    archivedWords,
    loading,
    totalCount,
    addWord,
    deleteWord,
    updateWord,
    updateWordProgress,
    getTrainingWords,
    refetch: fetchWords,
  };
};
