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
    list: (groupId?: string, fieldsKey?: string) =>
      groupId || fieldsKey
        ? (['words', { groupId: groupId ?? null, fields: fieldsKey ?? null }] as const)
        : (['words'] as const),
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
    guestWords: () => ['stats', 'guestWords'] as const, // Guest words для статистики
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
  archivedWords: {
    all: ['archivedWords'] as const,
  },
} as const;

/**
 * Инвалидация связанных ключей после мутаций.
 *
 * Принцип: инвалидировать только то, что реально изменилось.
 * Избегаем каскадной инвалидации — каждый мутация вызывает
 * ровно один refetch, а не 2-3 параллельных.
 *
 * stats и groups инвалидируются отдельно, когда действительно нужно.
 */
export function invalidateWords(queryClient: import('@tanstack/react-query').QueryClient) {
  // Инвалидируем все word-запросы (включая с fields= параметром)
  return queryClient.invalidateQueries({ queryKey: queryKey.words.all });
}

/**
 * Инвалидация конкретного слова (detail key) — минимальный refetch.
 * Используется после updateProgress, чтобы не рефетчить весь список.
 */
export function invalidateWordDetail(
  queryClient: import('@tanstack/react-query').QueryClient,
  wordId: string
) {
  return queryClient.invalidateQueries({ queryKey: queryKey.words.detail(wordId) });
}

export function invalidateGroups(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKey.groups.all });
}

export function invalidateProfile(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKey.profile.all });
}

export function invalidateStats(queryClient: import('@tanstack/react-query').QueryClient) {
  // Инвалидируем stats и guest words (для guest mode)
  queryClient.invalidateQueries({ queryKey: queryKey.stats.all });
  return queryClient.invalidateQueries({ queryKey: queryKey.stats.guestWords() });
}

export function invalidateStreaks(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKey.streaks.all });
}

export function invalidateAchievements(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKey.achievements.all });
}
