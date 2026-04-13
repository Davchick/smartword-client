import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Flame, BookOpen, CheckCircle2 } from 'lucide-react-native';
import { useTheme, fonts, spacing, radii, typography } from '../theme';
import { moderateScale } from '../utils/responsive';
import type { Stats } from '../hooks/useStats';
import { AnimatedBorderSnake } from './AnimatedBorderSnake';

interface Props {
  stats: Stats;
}

export const StatsWidget = ({ stats }: Props) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // Адаптивные размеры для дней недели
  // Начинаем сжимать с 420px
  const getDaySizes = () => {
    const baseWidth = 420;
    const minWrapperSize = 36;
    const minSquareSize = 32;
    const maxWrapperSize = 44;
    const maxSquareSize = 40;

    if (screenWidth >= baseWidth) {
      return {
        wrapperSize: maxWrapperSize,
        squareSize: maxSquareSize,
        gap: spacing.sm,
      };
    }

    const scale = (screenWidth - 320) / (baseWidth - 320);
    const clampedScale = Math.max(0, Math.min(1, scale));

    return {
      wrapperSize: Math.round(minWrapperSize + (maxWrapperSize - minWrapperSize) * clampedScale),
      squareSize: Math.round(minSquareSize + (maxSquareSize - minSquareSize) * clampedScale),
      gap: spacing.xs + Math.round((spacing.sm - spacing.xs) * clampedScale),
    };
  };

  const daySizes = getDaySizes();
  const animatedSnakeSize = daySizes.squareSize - 4;

  const styles = createStyles(daySizes);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Верхний ряд: метрики */}
      <View style={styles.metricsRow}>
        <MetricItem
          icon={<BookOpen color={colors.primary} size={moderateScale(16)} />}
          value={stats.totalWords}
          label="записано"
          colors={colors}
          compact
          styles={styles}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <MetricItem
          icon={<CheckCircle2 color={colors.success} size={moderateScale(16)} />}
          value={stats.learnedWords}
          label="изучено"
          colors={colors}
          valueColor={colors.success}
          compact
          styles={styles}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.streakItem}>
          <View style={styles.streakRow}>
            <Text style={[styles.streakValue, { color: colors.primary }]}>{stats.currentStreak}</Text>
            <View style={[styles.streakIconWrapper, { backgroundColor: colors.primaryDim }]}>
              <Flame color={colors.primary} size={moderateScale(14)} fill={colors.primary} />
            </View>
          </View>
          <Text style={[styles.streakLabel, { color: colors.muted }]}>дней подряд</Text>
        </View>
      </View>

      {/* Нижний ряд: неделя активности */}
      <View style={[styles.weekSection, { backgroundColor: colors.background }]}>
        <View style={[styles.weekDays, { gap: daySizes.gap }]}>
          {stats.weekActivity.map((day) => {
            const isActive = day.hasActivity;
            const isToday = day.isToday;

            const bgColor = isActive
              ? colors.primaryDim
              : isToday
              ? colors.primary + '15'
              : 'transparent';

            const borderColor = isActive ? colors.primary : (isToday ? 'transparent' : colors.border);

            // Получаем день месяца из даты
            const dayOfMonth = new Date(day.date).getDate();

            return (
              <View key={day.date} style={styles.dayItem}>
                <View style={[
                  styles.daySquareWrapper,
                  {
                    width: daySizes.wrapperSize,
                    height: daySizes.wrapperSize,
                  }
                ]}>
                  <View style={[
                    styles.daySquare,
                    {
                      width: daySizes.squareSize,
                      height: daySizes.squareSize,
                      borderRadius: Math.round(daySizes.squareSize * 0.2),
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      borderWidth: isActive ? 2 : 1.5,
                    },
                  ]}>
                    <Text style={[
                      styles.dayWeekday,
                      {
                        color: isActive || isToday ? colors.primary : colors.muted,
                        fontFamily: isToday || isActive ? fonts.bold : fonts.regular,
                        fontSize: screenWidth < 360 ? 9 : typography.xsmall,
                      },
                    ]}>
                      {day.dayLabel}
                    </Text>
                    <Text style={[
                      styles.dayDate,
                      {
                        color: isToday ? colors.primary : (isActive ? colors.primary : colors.text),
                        fontFamily: isToday || isActive ? fonts.bold : fonts.regular,
                        fontSize: screenWidth < 360 ? 11 : typography.small,
                      },
                    ]}>
                      {dayOfMonth}
                    </Text>
                  </View>
                  {isToday && (
                    <AnimatedBorderSnake
                      color={colors.primary}
                      size={animatedSnakeSize}
                      strokeWidth={2}
                      borderRadius={Math.round(daySizes.squareSize * 0.2)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const createStyles = (daySizes: { wrapperSize: number; squareSize: number; gap: number }) => StyleSheet.create({
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
  },
  dayItem: {
    alignItems: 'center',
  },
  daySquareWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  daySquare: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 4,
  },
  dayWeekday: {
    textTransform: 'lowercase',
    fontFamily: fonts.regular,
  },
  dayDate: {
    fontFamily: fonts.headingBlack,
  },

  // Стили для MetricItem
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    fontSize: typography.title,
    fontFamily: fonts.headingBlack,
  },
  metricLabel: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
});

interface MetricItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colors: any;
  valueColor?: string;
  compact?: boolean;
  styles: ReturnType<typeof createStyles>;
}

const MetricItem = ({ icon, value, label, colors, valueColor, compact, styles }: MetricItemProps) => (
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
