import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface WordGroup {
  id: string;
  name: string;
  language: string;
  created_at: string;
  word_count: number;
}

export const useGroups = () => {
  const [groups, setGroups] = useState<WordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error: fetchError } = await supabase
        .from('word_groups')
        .select('id, name, language, created_at, words(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const mapped = (data ?? []).map((g: any) => ({
          id: g.id as string,
          name: g.name as string,
          language: g.language as string,
          created_at: g.created_at as string,
          word_count: (g.words?.[0]?.count as number) ?? 0,
        }));
        setGroups(mapped);
        setError(null);
      }
      setLoading(false);
      return;
    }

    // Гостевой / неавторизованный режим: читаем из локального хранилища
    const [groupsRaw, wordsRaw] = await Promise.all([
      AsyncStorage.getItem('smartword_guest_groups'),
      AsyncStorage.getItem('smartword_guest_words'),
    ]);
    const guestGroups: WordGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];
    const guestWords: { id: string; group_id: string }[] = wordsRaw ? JSON.parse(wordsRaw) : [];

    const countsByGroup: Record<string, number> = {};
    for (const w of guestWords) {
      countsByGroup[w.group_id] = (countsByGroup[w.group_id] ?? 0) + 1;
    }

    const withCounts = guestGroups.map((g) => ({
      ...g,
      word_count: countsByGroup[g.id] ?? 0,
    }));

    setGroups(withCounts);
    setError(null);
    setLoading(false);
  }, []);

  const createGroup = async (name: string, language: string): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: insertError } = await supabase
        .from('word_groups')
        .insert({ name, language, user_id: user.id });

      if (insertError) return { error: insertError.message };
      await fetchGroups();
      return { error: null };
    }

    // Гостевой режим
    const groupsRaw = await AsyncStorage.getItem('smartword_guest_groups');
    const existing: WordGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];

    const now = new Date().toISOString();
    const newGroup: WordGroup = {
      id: `guest_${Date.now().toString()}_${Math.random().toString(16).slice(2)}`,
      name,
      language,
      created_at: now,
      word_count: 0,
    };

    const updated = [...existing, newGroup];
    await AsyncStorage.setItem('smartword_guest_groups', JSON.stringify(updated));
    setGroups(updated);

    return { error: null };
  };

  const deleteGroup = async (groupId: string): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: deleteError } = await supabase
        .from('word_groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) return { error: deleteError.message };
      await fetchGroups();
      return { error: null };
    }

    // Гостевой режим
    const [groupsRaw, wordsRaw] = await Promise.all([
      AsyncStorage.getItem('smartword_guest_groups'),
      AsyncStorage.getItem('smartword_guest_words'),
    ]);

    const existingGroups: WordGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];
    const existingWords: { id: string; group_id: string }[] = wordsRaw ? JSON.parse(wordsRaw) : [];

    const newGroups = existingGroups.filter((g) => g.id !== groupId);
    const newWords = existingWords.filter((w) => w.group_id !== groupId);

    await Promise.all([
      AsyncStorage.setItem('smartword_guest_groups', JSON.stringify(newGroups)),
      AsyncStorage.setItem('smartword_guest_words', JSON.stringify(newWords)),
    ]);

    setGroups(newGroups);
    return { error: null };
  };

  const renameGroup = async (
    groupId: string,
    name: string,
    language: string
  ): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: updateError } = await supabase
        .from('word_groups')
        .update({ name, language })
        .eq('id', groupId);
      if (updateError) return { error: updateError.message };
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, name, language } : g))
      );
      return { error: null };
    }

    // Гостевой режим
    const groupsRaw = await AsyncStorage.getItem('smartword_guest_groups');
    const existing: WordGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];
    const updated = existing.map((g) =>
      g.id === groupId ? { ...g, name, language } : g
    );
    await AsyncStorage.setItem('smartword_guest_groups', JSON.stringify(updated));
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name, language } : g))
    );
    return { error: null };
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, createGroup, deleteGroup, renameGroup, refetch: fetchGroups };
};
