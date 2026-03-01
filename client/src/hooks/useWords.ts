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
        setWords((prev) => [created, ...prev]);
        setTotalCount((c) => c + 1);
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Ошибка добавления' };
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
    setWords((prev) => [newWord, ...prev]);
    setTotalCount(updated.length);
    return { error: null };
  };

  const deleteWord = async (wordId: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiDelete(`/words/${wordId}`);
        setWords((prev) => prev.filter((w) => w.id !== wordId));
        setTotalCount((c) => Math.max(0, c - 1));
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Ошибка удаления' };
      }
    }
    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const updated = existing.filter((w) => w.id !== wordId);
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    setTotalCount(updated.length);
    return { error: null };
  };

  const updateWordProgress = async (
    wordId: string,
    knew: boolean,
    options?: { correctDelta?: number; incorrectDelta?: number }
  ): Promise<void> => {
    const word = words.find((w) => w.id === wordId);
    if (!word) return;
    const correctDelta = options?.correctDelta ?? 1;
    const incorrectDelta = options?.incorrectDelta ?? -1;
    const delta = knew ? correctDelta : incorrectDelta;
    const newCount = Math.max(0, word.correct_count + delta);

    if (authUser && getBaseUrl()) {
      try {
        await apiPost(`/words/${wordId}/progress`, { knew, correctDelta, incorrectDelta });
      } catch {
        //
      }
    } else {
      const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
      const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
      const updated = existing.map((w) =>
        w.id === wordId ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() } : w
      );
      await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    }
    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() } : w
      )
    );
  };

  const updateWord = async (wordId: string, original: string, translation: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiPatch<Word>(`/words/${wordId}`, { original, translation });
        setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, original, translation } : w)));
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Ошибка обновления' };
      }
    }
    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const updated = existing.map((w) => (w.id === wordId ? { ...w, original, translation } : w));
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, original, translation } : w)));
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
