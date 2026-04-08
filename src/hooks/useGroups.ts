/**
 * useGroups — React Query версия.
 *
 * - useQuery для загрузки групп
 * - useMutation для create/delete/rename — с optimistic updates
 * - invalidateQueries автоматически обновляет все экраны
 * - Guest mode через EncryptedStorage (AES-256, ключ в SecureStore)
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKey, invalidateGroups } from '../lib/queryKeys';
import { getGuestWords, getGuestGroups, setGuestGroups, setGuestWords } from '../lib/guestStorage';
import { ARCHIVE_THRESHOLD } from '../constants';

export interface WordGroup {
  id: string;
  name: string;
  language: string;
  created_at: string;
  word_count: number;
  learned_count?: number;
}

// ─── Guest mode helpers ────────────────────────────────────────────────

async function getGuestData(): Promise<{
  groups: WordGroup[];
  words: { id: string; group_id: string; correct_count: number }[];
}> {
  const [groups, words] = await Promise.all([
    getGuestGroups<WordGroup[]>(),
    getGuestWords<{ id: string; group_id: string; correct_count: number }[]>(),
  ]);
  return { groups: groups ?? [], words: words ?? [] };
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function computeWordCounts(groups: WordGroup[], words: { group_id: string; correct_count: number }[]): WordGroup[] {
  const totalCounts: Record<string, number> = {};
  const learnedCounts: Record<string, number> = {};
  for (const w of words) {
    totalCounts[w.group_id] = (totalCounts[w.group_id] ?? 0) + 1;
    if (w.correct_count >= ARCHIVE_THRESHOLD) {
      learnedCounts[w.group_id] = (learnedCounts[w.group_id] ?? 0) + 1;
    }
  }
  return groups.map((g) => ({
    ...g,
    word_count: totalCounts[g.id] ?? 0,
    learned_count: learnedCounts[g.id] ?? 0,
  }));
}

// ─── Query function ────────────────────────────────────────────────────

async function fetchGroupsQuery(authUser: ReturnType<typeof useAuth>['user']): Promise<WordGroup[]> {
  if (authUser && getBaseUrl()) {
    return apiGet<WordGroup[]>('/groups');
  }

  // Guest mode — считаем word_count из guest слов
  const { groups, words } = await getGuestData();
  return computeWordCounts(groups, words);
}

// ─── Hook ──────────────────────────────────────────────────────────────

export const useGroups = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: groups = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKey.groups.list(),
    queryFn: () => fetchGroupsQuery(authUser),
    staleTime: 60 * 1000, // 1 мин — группы меняются реже чем слова
    gcTime: 5 * 60 * 1000,
  });

  // ─── Mutations ─────────────────────────────────────────────────────

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, language }: { name: string; language: string }) => {
      if (authUser && getBaseUrl()) {
        return apiPost<WordGroup>('/groups', { name, language });
      }
      // Guest mode
      const { groups: existing } = await getGuestData();
      const newGroup: WordGroup = {
        id: generateGuestId(),
        name,
        language,
        created_at: new Date().toISOString(),
        word_count: 0,
      };
      await setGuestGroups([...existing, newGroup]);
      return newGroup;
    },
    onMutate: async ({ name, language }) => {
      const qKey = queryKey.groups.list();
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<WordGroup[]>(qKey);

      const optimisticGroup: WordGroup = {
        id: generateGuestId(),
        name,
        language,
        created_at: new Date().toISOString(),
        word_count: 0,
      };

      queryClient.setQueryData(qKey, (old: WordGroup[] | undefined) => [
        ...(old ?? []),
        optimisticGroup,
      ]);

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey.groups.list(), ctx.previous);
      }
    },
    onSettled: () => {
      invalidateGroups(queryClient);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (authUser && getBaseUrl()) {
        return apiDelete(`/groups/${groupId}`);
      }
      // Guest mode
      const { groups: existingGroups, words: existingWords } = await getGuestData();
      await Promise.all([
        setGuestGroups(existingGroups.filter((g) => g.id !== groupId)),
        setGuestWords(existingWords.filter((w) => w.group_id !== groupId)),
      ]);
    },
    onMutate: async (groupId) => {
      const qKey = queryKey.groups.list();
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<WordGroup[]>(qKey);

      queryClient.setQueryData(qKey, (old: WordGroup[] | undefined) =>
        old?.filter((g) => g.id !== groupId) ?? []
      );

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey.groups.list(), ctx.previous);
      }
    },
    onSettled: () => {
      invalidateGroups(queryClient);
    },
  });

  const renameGroupMutation = useMutation({
    mutationFn: async ({
      groupId,
      name,
      language,
    }: {
      groupId: string;
      name: string;
      language: string;
    }) => {
      if (authUser && getBaseUrl()) {
        return apiPatch<WordGroup>(`/groups/${groupId}`, { name, language });
      }
      // Guest mode
      const { groups: existing } = await getGuestData();
      const updated = existing.map((g) =>
        g.id === groupId ? { ...g, name, language } : g
      );
      await setGuestGroups(updated);
      return updated.find((g) => g.id === groupId);
    },
    onMutate: async ({ groupId, name, language }) => {
      const qKey = queryKey.groups.list();
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<WordGroup[]>(qKey);

      queryClient.setQueryData(qKey, (old: WordGroup[] | undefined) =>
        old?.map((g) => (g.id === groupId ? { ...g, name, language } : g)) ?? []
      );

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey.groups.list(), ctx.previous);
      }
    },
    onSettled: () => {
      invalidateGroups(queryClient);
    },
  });

  return {
    groups,
    loading,
    error: error ? 'Не удалось загрузить словари' : null,
    createGroup: async (name: string, language: string) => {
      try {
        await createGroupMutation.mutateAsync({ name, language });
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось создать словарь' };
      }
    },
    deleteGroup: async (groupId: string) => {
      try {
        await deleteGroupMutation.mutateAsync(groupId);
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось удалить словарь' };
      }
    },
    renameGroup: async (groupId: string, name: string, language: string) => {
      try {
        await renameGroupMutation.mutateAsync({ groupId, name, language });
        return { error: null };
      } catch (err: unknown) {
        const e = err as { body?: { error?: string } };
        return { error: e?.body?.error ?? 'Не удалось обновить словарь' };
      }
    },
    refetch: () => refetch(),
  };
};
