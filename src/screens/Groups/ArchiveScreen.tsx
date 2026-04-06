import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
import { useWords } from '../../hooks/useWords';
import { useGroups } from '../../hooks/useGroups';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';
import type { WordGroup } from '../../hooks/useGroups';

type Props = NativeStackScreenProps<GroupsStackParamList, 'Archive'>;

const ARCHIVE_THRESHOLD = 5;

interface Section {
  groupId: string;
  groupName: string;
  language: string;
  data: Word[];
}

export const ArchiveScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { words, loading } = useWords();
  const { groups } = useGroups();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'score'>('count');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Все архивированные слова
  const archivedWords = useMemo(
    () => words.filter((w) => w.correct_count >= ARCHIVE_THRESHOLD),
    [words]
  );

  // Словарь id→group для быстрого доступа
  const groupMap = useMemo(() => {
    const m: Record<string, WordGroup> = {};
    for (const g of groups) m[g.id] = g;
    return m;
  }, [groups]);

  // Фильтруем по запросу
  const filtered = useMemo(() => {
    let list = archivedWords;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (w) =>
          w.original.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q)
      );
    }
    return list;
  }, [archivedWords, query]);

  // Группируем по словарям и сортируем
  const sections: Section[] = useMemo(() => {
    const map: Record<string, Word[]> = {};
    for (const w of filtered) {
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
  }, [filtered, groupMap, sortBy]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Статистика
  const totalArchived = archivedWords.length;
  const totalGroups = sections.length;
  const avgScore =
    archivedWords.length > 0
      ? Math.round(
          archivedWords.reduce((s, w) => s + w.correct_count, 0) / archivedWords.length
        )
      : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
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
              {ARCHIVE_THRESHOLD} правильных ответов
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
          searchQuery={query}
          onSearchChange={setQuery}
          searchPlaceholder="Поиск по словам..."
          onSortPress={() => setSortSheetVisible(true)}
        />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s) => s.groupId}
        contentContainerStyle={styles.list}
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
                      : `Ещё ${section.data.length - 3} слов`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
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
  noResultsWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  noResultsText: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
  },
});
