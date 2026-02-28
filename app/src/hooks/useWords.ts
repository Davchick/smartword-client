import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

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
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (user) {
      let query = supabase
        .from('words')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data } = await query;
      setWords(data ?? []);

      if (!groupId) {
        setTotalCount(data?.length ?? 0);
      } else {
        const { count } = await supabase
          .from('words')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
      return;
    }

    // Гостевой / неавторизованный режим: слова в локальном хранилище
    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const allWords: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const filtered = groupId
      ? allWords.filter((w) => w.group_id === groupId)
      : allWords;

    setWords(filtered);
    setTotalCount(allWords.length);
    setLoading(false);
  }, [groupId]);

  const addWord = async (
    original: string,
    translation: string,
    gId: string
  ): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getSession().then(r => ({ data: { user: r.data.session?.user ?? null } }));

    if (user) {
      const { error } = await supabase
        .from('words')
        .insert({ original, translation, group_id: gId, user_id: user.id });

      if (error) return { error: error.message };
      await fetchWords();
      return { error: null };
    }

    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];

    const now = new Date().toISOString();
    const newWord: Word = {
      id: `guest_${Date.now().toString()}_${Math.random().toString(16).slice(2)}`,
      group_id: gId,
      user_id: 'guest',
      original,
      translation,
      correct_count: 0,
      last_reviewed: null,
      created_at: now,
    };

    const updated = [newWord, ...existing];
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    setWords((prev) => [newWord, ...prev]);
    setTotalCount(updated.length);

    return { error: null };
  };

  const deleteWord = async (wordId: string): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getSession().then(r => ({ data: { user: r.data.session?.user ?? null } }));

    if (user) {
      const { error } = await supabase.from('words').delete().eq('id', wordId);
      if (error) return { error: error.message };
      await fetchWords();
      return { error: null };
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

    const {
      data: { user },
    } = await supabase.auth.getSession().then(r => ({ data: { user: r.data.session?.user ?? null } }));

    if (user) {
      await supabase
        .from('words')
        .update({ correct_count: newCount, last_reviewed: new Date().toISOString() })
        .eq('id', wordId);
    } else {
      const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
      const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
      const updated = existing.map((w) =>
        w.id === wordId
          ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() }
          : w
      );
      await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    }

    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId
          ? { ...w, correct_count: newCount, last_reviewed: new Date().toISOString() }
          : w
      )
    );
  };

  const updateWord = async (
    wordId: string,
    original: string,
    translation: string
  ): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getSession().then(r => ({ data: { user: r.data.session?.user ?? null } }));

    if (user) {
      const { error } = await supabase
        .from('words')
        .update({ original, translation })
        .eq('id', wordId);
      if (error) return { error: error.message };
      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? { ...w, original, translation } : w))
      );
      return { error: null };
    }

    const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
    const existing: Word[] = wordsRaw ? JSON.parse(wordsRaw) : [];
    const updated = existing.map((w) =>
      w.id === wordId ? { ...w, original, translation } : w
    );
    await AsyncStorage.setItem('smartword_guest_words', JSON.stringify(updated));
    setWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, original, translation } : w))
    );
    return { error: null };
  };

  // Порог архивации: слово считается выученным
  const ARCHIVE_THRESHOLD = 5;

  // Слова для тренировки: только не архивированные, сначала слабее знакомые
  const getTrainingWords = (): Word[] => {
    return [...words]
      .filter((w) => w.correct_count < ARCHIVE_THRESHOLD)
      .sort((a, b) => {
        if (a.correct_count !== b.correct_count) return a.correct_count - b.correct_count;
        const dateA = a.last_reviewed ? new Date(a.last_reviewed).getTime() : 0;
        const dateB = b.last_reviewed ? new Date(b.last_reviewed).getTime() : 0;
        return dateA - dateB;
      });
  };

  // Архивированные слова (окончательно выученные)
  const archivedWords = words.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

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
