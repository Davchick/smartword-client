import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiPatch, apiDelete, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface WordGroup {
  id: string;
  name: string;
  language: string;
  created_at: string;
  word_count: number;
}

export const useGroups = () => {
  const { user: authUser } = useAuth();
  const [groups, setGroups] = useState<WordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      if (authUser && getBaseUrl()) {
        const data = await apiGet<WordGroup[]>('/groups');
        setGroups(data ?? []);
        setError(null);
        return;
      }

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
    } catch (e) {
      console.warn('[useGroups] fetchGroups error', e);
      setError('Не удалось загрузить словари');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, language: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiPost<WordGroup>('/groups', { name, language });
        await fetchGroups();
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось создать словарь' };
      }
    }
    const groupsRaw = await AsyncStorage.getItem('smartword_guest_groups');
    const existing: WordGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];
    const newGroup: WordGroup = {
      id: `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      language,
      created_at: new Date().toISOString(),
      word_count: 0,
    };
    await AsyncStorage.setItem('smartword_guest_groups', JSON.stringify([...existing, newGroup]));
    setGroups((prev) => [...prev, newGroup]);
    return { error: null };
  };

  const deleteGroup = async (groupId: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiDelete(`/groups/${groupId}`);
        await fetchGroups();
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось удалить словарь' };
      }
    }
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

  const renameGroup = async (groupId: string, name: string, language: string): Promise<{ error: string | null }> => {
    if (authUser && getBaseUrl()) {
      try {
        await apiPatch<WordGroup>(`/groups/${groupId}`, { name, language });
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name, language } : g)));
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось обновить словарь' };
      }
    }
    const groupsRaw = await AsyncStorage.getItem('smartword_guest_groups');
    const existing: WordGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];
    const updated = existing.map((g) => (g.id === groupId ? { ...g, name, language } : g));
    await AsyncStorage.setItem('smartword_guest_groups', JSON.stringify(updated));
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name, language } : g)));
    return { error: null };
  };

  return { groups, loading, error, createGroup, deleteGroup, renameGroup, refetch: fetchGroups };
};
