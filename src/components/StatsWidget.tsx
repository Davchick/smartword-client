import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, BookOpen, CheckCircle2 } from 'lucide-react-native';
import { useTheme, fonts, spacing, radii, typography } from '../theme';
import type { Stats } from '../hooks/useStats';

interface Props {
  stats: Stats;
}

export const StatsWidget = ({ stats }: Props) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Верхний ряд: метрики */}
      <View style={styles.metricsRow}>
        <MetricItem
          icon={<BookOpen color={colors.primary} size={16} />}
          value={stats.totalWords}
          label="записано"
          colors={colors}
          compact
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <MetricItem
          icon={<CheckCircle2 color={colors.success} size={16} />}
          value={stats.learnedWords}
          label="изучено"
          colors={colors}
          valueColor={colors.success}
          compact
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.streakItem}>
          <View style={styles.streakRow}>
            <Text style={[styles.streakValue, { color: colors.primary }]}>{stats.currentStreak}</Text>
            <View style={[styles.streakIconWrapper, { backgroundColor: colors.primaryDim }]}>
              <Flame color={colors.primary} size={14} fill={colors.primary} />
            </View>
          </View>
          <Text style={[styles.streakLabel, { color: colors.muted }]}>дней подряд</Text>
        </View>
      </View>

      {/* Нижний ряд: неделя активности */}
      <View style={[styles.weekSection, { backgroundColor: colors.background }]}>
        <View style={styles.weekDays}>
          {stats.weekActivity.map((day) => {
            const isActive = day.hasActivity;
            const isToday = day.isToday;

            const bgColor = isActive
              ? colors.primaryDim
              : isToday
              ? colors.primary + '15'
              : 'transparent';

            const borderColor = isActive || isToday ? colors.primary : colors.border;

            // Получаем день месяца из даты
            const dayOfMonth = new Date(day.date).getDate();

            return (
              <View key={day.date} style={styles.dayItem}>
                <View style={[
                  styles.daySquare,
                  {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: isActive || isToday ? 2 : 1.5,
                  },
                ]}>
                  <Text style={[
                    styles.dayWeekday,
                    {
                      color: isActive || isToday ? colors.primary : colors.muted,
                      fontFamily: isToday || isActive ? fonts.bold : fonts.regular,
                    },
                  ]}>
                    {day.dayLabel}
                  </Text>
                  <Text style={[
                    styles.dayDate,
                    {
                      color: isActive || isToday ? colors.primary : colors.text,
                      fontFamily: isToday || isActive ? fonts.bold : fonts.regular,
                    },
                  ]}>
                    {dayOfMonth}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

interface MetricItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colors: any;
  valueColor?: string;
  compact?: boolean;
}

const MetricItem = ({ icon, value, label, colors, valueColor, compact }: MetricItemProps) => (
  <View style={compact ? styles.metricItemCompact : styles.metricItem}>
    <View style={compact ? styles.metricRowInner : styles.metricRow}>
      <Text style={[compact ? styles.metricValueCompact : styles.metricValue, { color: valueColor || colors.text }]}>
        {value}
      </Text>
      {compact && <View style={styles.metricIconWrapperCompact}>{icon}</View>}
    </View>
    <Text style={[compact ? styles.metricLabelCompact : styles.metricLabel, { color: colors.muted }]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  metricItemCompact: {
    alignItems: 'center',
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.sm,
  },
  metricIconWrapperCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValueCompact: {
    fontSize: typography.body,
    fontFamily: fonts.headingBlack,
    lineHeight: 26,
  },
  metricLabelCompact: {
    fontSize: typography.xsmall,
    fontFamily: fonts.regular,
  },
  streakItem: {
    alignItems: 'center',
    gap: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: {
    fontSize: typography.body,
    fontFamily: fonts.headingBlack,
    lineHeight: 26,
  },
  streakLabel: {
    fontSize: typography.xsmall,
    fontFamily: fonts.regular,
  },
  weekSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayItem: {
    alignItems: 'center',
  },
  daySquare: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 4,
  },
  dayWeekday: {
    fontSize: typography.xsmall,
    textTransform: 'lowercase',
    fontFamily: fonts.regular,
  },
  dayDate: {
    fontSize: typography.small,
    fontFamily: fonts.headingBlack,
  },

  // Старые стили (для обратной совместимости)
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.title,
    fontFamily: fonts.headingBlack,
  },
  metricLabel: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weekTitle: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  streakIndicatorText: {
    fontSize: typography.xs,
    fontFamily: fonts.bold,
  },
  contentRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  metricsCol: {
    flex: 1,
    gap: spacing.sm,
  },
  dividerH: {
    height: 1,
    marginVertical: spacing.xs,
  },
  weekCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayItemCompact: {
    alignItems: 'center',
    gap: 4,
  },
  dayCircleCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotCompact: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dayLabelCompact: {
    fontSize: typography.xsmall,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.xsmall,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  streakText: {
    fontSize: typography.xsmall,
    fontFamily: fonts.bold,
  },
});
