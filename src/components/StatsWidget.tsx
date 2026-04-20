import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Flame, BookOpen, CheckCircle2 } from 'lucide-react-native';
import { useTheme, fonts, spacing, radii, typography } from '../theme';
import type { Stats } from '../hooks/useStats';
import { AnimatedBorderSnake } from './AnimatedBorderSnake';

interface Props {
  stats: Stats;
}

export const StatsWidget = ({ stats }: Props) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // Адаптивные размеры для иконок метрик
  // Сжимаем на экранах < 375px (iPhone SE и аналоги)
  const getIconSizes = () => {
    const baseWidth = 375;
    const minIconSize = 14;
    const maxIconSize = 16;
    const minStreakIcon = 12;
    const maxStreakIcon = 14;

    if (screenWidth >= baseWidth) {
      return {
        metricIcon: maxIconSize,
        streakIcon: maxStreakIcon,
      };
    }

    const scale = Math.max(0, Math.min(1, (screenWidth - 320) / (baseWidth - 320)));

    return {
      metricIcon: Math.round(minIconSize + (maxIconSize - minIconSize) * scale),
      streakIcon: Math.round(minStreakIcon + (maxStreakIcon - minStreakIcon) * scale),
    };
  };

  const iconSizes = getIconSizes();

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
  // Размер SVG с учётом stroke (анимация выходит за пределы квадрата)
  const strokeWidth = 2;
  const svgSize = daySizes.squareSize + strokeWidth * 2;

  // Адаптивный левый отступ для секции с днями недели
  // Уменьшаем только paddingLeft начиная с 405px
  const getWeekSectionPadding = () => {
    const baseWidth = 405;
    const minPaddingLeft = 8;
    const maxPaddingLeft = spacing.md; // 12px

    if (screenWidth >= baseWidth) {
      return {
        paddingLeft: maxPaddingLeft,
        paddingRight: spacing.md,
      };
    }

    const scale = Math.max(0, Math.min(1, (screenWidth - 320) / (baseWidth - 320)));

    return {
      paddingLeft: Math.round(minPaddingLeft + (maxPaddingLeft - minPaddingLeft) * scale),
      paddingRight: spacing.md,
    };
  };

  const weekSectionPadding = getWeekSectionPadding();

  const styles = createStyles(daySizes);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Верхний ряд: метрики */}
      <View style={styles.metricsRow}>
        <MetricItem
          icon={<BookOpen color={colors.primary} size={iconSizes.metricIcon} />}
          value={stats.totalWords}
          label="записано"
          colors={colors}
          compact
          styles={styles}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <MetricItem
          icon={<CheckCircle2 color={colors.success} size={iconSizes.metricIcon} />}
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
              <Flame color={colors.primary} size={iconSizes.streakIcon} fill={colors.primary} />
            </View>
          </View>
          <Text style={[styles.streakLabel, { color: colors.muted }]}>дней подряд</Text>
        </View>
      </View>

      {/* Нижний ряд: неделя активности */}
      <View style={[styles.weekSection, { backgroundColor: colors.background, paddingLeft: weekSectionPadding.paddingLeft, paddingRight: weekSectionPadding.paddingRight }]}>
        <View style={[styles.weekDays, { gap: daySizes.gap }]}>
          {stats.weekActivity.map((day) => {
            const isToday = day.isToday;
            const isActive = day.hasActivity && !isToday;

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
                    width: svgSize,
                    height: svgSize,
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
                      size={daySizes.squareSize}
                      strokeWidth={strokeWidth}
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
    paddingVertical: spacing.sm,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySquareWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
