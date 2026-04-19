import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Archive,
  Trophy,
  Star,
  BookOpen,
  Layers,
  Search,
} from 'lucide-react-native';
import { useArchivedWords } from '../../hooks/useArchivedWords';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../contexts/AuthContext';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SkeletonScreen } from '../../components/ui/SkeletonScreen';
import { useDebounceValue } from '../../hooks/useDebounceValue';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { pluralizeRu } from '../../lib/pluralizeRu';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../navigation/types';
import type { WordGroup } from '../../hooks/useGroups';
import type { ArchivedWord } from '../../hooks/useArchivedWords';

type Props = NativeStackScreenProps<GroupsStackParamList, 'Archive'>;

interface Section {
  groupId: string;
  groupName: string;
  language: string;
  data: ArchivedWord[];
}

export const ArchiveScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [queryText, setQueryText] = useState('');
  const debouncedQuery = useDebounceValue(queryText, 350);
  const { words, totalCount, loading, refreshing, hasNext, loadMore, loadMoreLoading, refetch, query } = useArchivedWords(debouncedQuery.trim() || undefined);
  const { groups } = useGroups();
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'score'>('count');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { refreshing: localRefreshing, handleRefresh, lastUpdated } = usePullToRefresh({
    onRefresh: () => refetch(),
  });

  // Слова приходят уже отфильтрованными по search query с сервера
  const archivedWordsList = words;

  // Словарь id→group для быстрого доступа
  const groupMap = useMemo(() => {
    const m: Record<string, WordGroup> = {};
    for (const g of groups) m[g.id] = g;
    return m;
  }, [groups]);

  // Группируем по словарям и сортируем
  const sections: Section[] = useMemo(() => {
    const map: Record<string, ArchivedWord[]> = {};
    for (const w of archivedWordsList) {
      if (!map[w.group_id]) map[w.group_id] = [];
      map[w.group_id]!.push(w);
    }
    const secs = Object.entries(map).map(([groupId, data]) => ({
      groupId,
      groupName: groupMap[groupId]?.name ?? 'Неизвестный словарь',
      language: groupMap[groupId]?.language ?? '',
      data: data.sort((a, b) => b.correct_count - a.correct_count),
    }));

    if (sortBy === 'count') {
      secs.sort((a, b) => b.data.length - a.data.length);
    } else if (sortBy === 'name') {
      secs.sort((a, b) => a.groupName.localeCompare(b.groupName));
    } else if (sortBy === 'score') {
      secs.sort((a, b) => {
        const avgA = a.data.reduce((s, w) => s + w.correct_count, 0) / a.data.length;
        const avgB = b.data.reduce((s, w) => s + w.correct_count, 0) / b.data.length;
        return avgB - avgA;
      });
    }
    return secs;
  }, [archivedWordsList, groupMap, sortBy]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Статистика
  const totalArchived = totalCount;
  const totalGroups = sections.length;
  const avgScore =
    archivedWordsList.length > 0
      ? Math.round(
          archivedWordsList.reduce((s, w) => s + w.correct_count, 0) / archivedWordsList.length
        )
      : 0;

  if (loading) {
    return <SkeletonScreen type="list" count={3} showHeader showStats />;
  }

  if (query.isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Архив</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.danger }]}>Ошибка загрузки</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Не удалось загрузить архивные слова. Проверьте подключение к интернету.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={[styles.emptyButtonText, { color: colors.background }]}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (totalArchived === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Архив</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Выученные слова</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(251,191,36,0.1)' }]}>
            <Archive color="#FBBF24" size={48} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Архив пуст</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Слова попадают сюда после{' '}
            <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
              5 правильных ответов
            </Text>{' '}
            подряд в тренировках. Продолжайте практиковаться!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Архив</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Выученные слова</Text>
          {lastUpdated && (
            <Text 
              style={[styles.lastUpdated, { color: colors.muted }]}
              accessibilityRole="text"
              accessibilityLabel={`Последнее обновление: ${lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
              accessibilityLiveRegion="polite"
            >
              Обновлено: {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.headerContent, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <View style={[styles.statsBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statBannerItem}>
            <View style={[styles.statBannerIcon, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
              <Trophy color="#FBBF24" size={20} />
            </View>
            <Text style={[styles.statBannerValue, { color: colors.text }]}>{totalArchived}</Text>
            <Text style={[styles.statBannerLabel, { color: colors.muted }]}>Выучено</Text>
          </View>
          <View style={[styles.statBannerDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBannerItem}>
            <View style={[styles.statBannerIcon, { backgroundColor: colors.primaryDim }]}>
              <Layers color={colors.primary} size={20} />
            </View>
            <Text style={[styles.statBannerValue, { color: colors.text }]}>{totalGroups}</Text>
            <Text style={[styles.statBannerLabel, { color: colors.muted }]}>Словарей</Text>
          </View>
          <View style={[styles.statBannerDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBannerItem}>
            <View style={[styles.statBannerIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
              <Star color={colors.success} size={20} />
            </View>
            <Text style={[styles.statBannerValue, { color: colors.text }]}>{avgScore}×</Text>
            <Text style={[styles.statBannerLabel, { color: colors.muted }]}>Ср. счёт</Text>
          </View>
        </View>

        <SearchFilterBar
          searchQuery={queryText}
          onSearchChange={setQueryText}
          searchPlaceholder="Поиск по словам..."
          onSortPress={() => setSortSheetVisible(true)}
        />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s) => s.groupId}
        contentContainerStyle={styles.list}
        refreshControl={
          user ? (
            <RefreshControl
              refreshing={localRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        onEndReached={() => {
          if (hasNext && !loadMoreLoading) loadMore();
        }}
        onEndReachedThreshold={0.3}
        windowSize={5}
        maxToRenderPerBatch={5}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === 'android'}
        ListFooterComponent={
          loadMoreLoading ? (
            <View style={styles.loadMoreLoader}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.noResultsWrap}>
            <Search color={colors.muted} size={36} strokeWidth={1.5} />
            <Text style={[styles.noResultsText, { color: colors.muted }]}>
              Ничего не найдено
            </Text>
          </View>
        }
        renderItem={({ item: section }) => {
          const isExpanded = expandedGroups.has(section.groupId);
          const showAll = isExpanded || section.data.length <= 3;
          const visibleWords = showAll ? section.data : section.data.slice(0, 3);

          return (
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Заголовок секции */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: colors.primaryDim }]}>
                  <BookOpen color={colors.primary} size={16} />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
                    {section.groupName}
                  </Text>
                  {section.language ? (
                    <Text style={[styles.sectionLang, { color: colors.primary }]}>
                      {section.language}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.sectionBadge, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                  <Text style={[styles.sectionBadgeText, { color: '#FBBF24' }]}>
                    {section.data.length}
                  </Text>
                </View>
              </View>

              <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

              {/* Слова */}
              {visibleWords.map((word, idx) => (
                <View
                  key={word.id}
                  style={[
                    styles.wordRow,
                    idx < visibleWords.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.wordTexts}>
                    <Text style={[styles.wordNative, { color: colors.textSecondary }]}>
                      {word.translation}
                    </Text>
                    <Text style={[styles.wordForeign, { color: colors.text }]}>{word.original}</Text>
                  </View>
                  <View style={styles.wordScore}>
                    {Array.from({ length: Math.min(Math.floor(word.correct_count), 5) }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.scoreDot,
                          { backgroundColor: i < word.correct_count ? '#FBBF24' : colors.border },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ))}

              {/* Показать больше / меньше */}
              {section.data.length > 3 && (
                <TouchableOpacity
                  style={[styles.expandBtn, { borderTopColor: colors.border }]}
                  onPress={() => toggleGroup(section.groupId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.expandBtnText, { color: colors.primary }]}>
                    {isExpanded
                      ? 'Свернуть'
                      : `Ещё ${pluralizeRu(section.data.length - 3, ['слово', 'слова', 'слов'])}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Sort Options BottomSheet */}
      <BottomSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        title="Сортировка словарей"
        subtitle="Как упорядочить словари в архиве"
      >
        {([
          { key: 'count' as const, label: 'По количеству слов' },
          { key: 'name' as const, label: 'По названию' },
          { key: 'score' as const, label: 'По среднему счёту' },
        ]).map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortOption,
              sortBy === option.key && { backgroundColor: colors.primaryDim },
            ]}
            onPress={() => {
              setSortBy(option.key);
              setSortSheetVisible(false);
            }}
          >
            <Text
              style={[
                styles.sortOptionText,
                { color: sortBy === option.key ? colors.primary : colors.text },
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.key && (
              <View style={[styles.sortCheckmark, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
  },
  headerSubtitle: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  lastUpdated: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  // Stats banner
  statsBanner: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statBannerItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBannerValue: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
  },
  statBannerLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
  statBannerDivider: {
    width: 1,
    height: 40,
  },
  headerContent: {
    gap: spacing.md,
  },
  // Section cards
  sectionCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleBlock: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
  },
  sectionLang: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
  },
  sectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    minWidth: 28,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: typography.small,
    fontFamily: fonts.bold,
  },
  sectionDivider: {
    height: 1,
  },
  // Word rows
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  wordTexts: {
    flex: 1,
    gap: 2,
  },
  wordForeign: {
    fontSize: typography.subtitle,
    fontFamily: fonts.bold,
  },
  wordNative: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  wordScore: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expandBtn: {
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  expandBtnText: {
    fontSize: typography.small,
    fontFamily: fonts.bold,
  },
  // Empty states
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  emptyButtonText: {
    fontWeight: '700',
    fontSize: typography.body,
  },
  noResultsWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  noResultsText: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
  },
  loadMoreLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  // Sort option styles
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  sortOptionText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  sortCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
