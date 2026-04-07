/**
 * Типобезопасные ключи запросов для React Query.
 *
 * Централизованное управление всеми query keys — при изменении
 * структуры автоматически обновляются все места инвалидации.
 *
 * Использование:
 *   queryKey.words.list()        → ['words']
 *   queryKey.words.detail(id)    → ['words', id]
 *   queryKey.words.byGroup(gid)  → ['words', { groupId: gid }]
 */

export const queryKey = {
  words: {
    all: ['words'] as const,
    list: (groupId?: string) =>
      groupId ? (['words', { groupId }] as const) : (['words'] as const),
    detail: (id: string) => ['words', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: () => ['groups'] as const,
    detail: (id: string) => ['groups', id] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => ['profile', 'me'] as const,
  },
  stats: {
    all: ['stats'] as const,
    overview: () => ['stats', 'overview'] as const,
    trainingProgress: () => ['stats', 'training-progress'] as const,
  },
  streaks: {
    all: ['streaks'] as const,
    current: () => ['streaks', 'current'] as const,
    history: () => ['streaks', 'history'] as const,
  },
  achievements: {
    all: ['achievements'] as const,
    list: () => ['achievements', 'list'] as const,
    summary: () => ['achievements', 'summary'] as const,
  },
} as const;

/**
 * Инвалидация связанных ключей после мутаций.
 *
 * useWordMutations.invalidateAll(queryClient) — инвалидирует слова + группы + статистику
 */
export function invalidateWords(queryClient: import('@tanstack/react-query').QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKey.words.all }),
    queryClient.invalidateQueries({ queryKey: queryKey.groups.all }),
    queryClient.invalidateQueries({ queryKey: queryKey.stats.all }),
  ]);
}

export function invalidateGroups(queryClient: import('@tanstack/react-query').QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKey.groups.all }),
    queryClient.invalidateQueries({ queryKey: queryKey.stats.all }),
  ]);
}

export function invalidateProfile(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKey.profile.all });
}

export function invalidateStats(queryClient: import('@tanstack/react-query').QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKey.stats.all }),
    queryClient.invalidateQueries({ queryKey: queryKey.profile.all }),
  ]);
}

export function invalidateStreaks(queryClient: import('@tanstack/react-query').QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKey.streaks.all }),
    queryClient.invalidateQueries({ queryKey: queryKey.stats.all }),
  ]);
}

export function invalidateAchievements(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKey.achievements.all });
}
