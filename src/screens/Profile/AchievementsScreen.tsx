import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme, spacing, typography, fonts, radii } from '../../theme';
import { AchievementCard } from '../../components/AchievementCard';
import { useAchievements } from '../../hooks/useAchievements';
import { useAuth } from '../../contexts/AuthContext';
import { StreakCounter } from '../../components/StreakCounter';
import { useStreak } from '../../hooks/useStreak';
import { queryClient } from '../../lib/queryClient';
import { queryKey } from '../../lib/queryKeys';

type CategoryFilter = 'all' | 'streak' | 'words' | 'swipe' | 'chat';

export const AchievementsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { achievements, summary, loading } = useAchievements();
  const { streak } = useStreak();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKey.achievements.all });
    setRefreshing(false);
  }, []);

  const filteredAchievements = useMemo(
    () => filter === 'all' ? achievements : achievements.filter((a) => a.category === filter),
    [filter, achievements]
  );

  const categories: { key: CategoryFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Все', icon: '🏆' },
    { key: 'streak', label: 'Серии', icon: '🔥' },
    { key: 'words', label: 'Слова', icon: '📚' },
    { key: 'swipe', label: 'Свайп', icon: '👆' },
    { key: 'chat', label: 'Чат', icon: '💬' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        user ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Достижения</Text>
        {summary && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {summary.unlocked}/{summary.total}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>открыто</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {summary.totalPoints}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>очков</Text>
            </View>
          </View>
        )}
      </View>

      {/* Streak Widget */}
      {streak && (
        <View style={styles.streakWidget}>
          <StreakCounter
            streak={streak.currentStreak}
            longestStreak={streak.longestStreak}
            size="large"
          />
        </View>
      )}

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setFilter(cat.key)}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === cat.key ? colors.primary : colors.card,
                borderColor: filter === cat.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={styles.filterIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.filterLabel,
                {
                  color: filter === cat.key ? colors.background : colors.text,
                },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements List */}
      <View style={styles.list}>
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Загрузка...</Text>
        ) : filteredAchievements.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Достижения пока не найдены
          </Text>
        ) : (
          filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.title,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.title,
    fontFamily: fonts.bold,
  },
  summaryLabel: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  streakWidget: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  filterIcon: {
    fontSize: typography.body,
  },
  filterLabel: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.body,
    fontFamily: fonts.regular,
    marginTop: spacing.xl,
  },
});
