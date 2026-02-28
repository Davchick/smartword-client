import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTheme, fonts, spacing, radii, typography } from '../theme';
import type { Stats } from '../hooks/useStats';

interface Props {
  stats: Stats;
}

export const StatsWidget = ({ stats }: Props) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {/* Три круглых показателя */}
      <View style={styles.circlesRow}>
        <StatCircle
          value={stats.totalWords}
          label="Записано"
          color={colors.primary}
          bg={colors.primaryDim}
          colors={colors}
        />
        <StatCircle
          value={stats.learnedWords}
          label="Изучено"
          color={colors.success}
          bg={'rgba(52,211,153,0.12)'}
          colors={colors}
        />
        <StatCircle
          value={stats.currentStreak}
          label="Дней подряд"
          color={'#FBBF24'}
          bg={'rgba(251,191,36,0.12)'}
          colors={colors}
          icon={stats.currentStreak > 0 ? <Flame color="#FBBF24" size={16} fill="#FBBF24" /> : undefined}
        />
      </View>

      {/* 7 дней недели */}
      <View style={[styles.weekRow]}>
        {stats.weekActivity.map((day) => {
          const isActive = day.hasActivity;
          const isToday = day.isToday;
          const isFuture = day.isFuture;

          // Цвет кружка: активный день → синий, сегодня без активности → обводка primary, прошлый/будущий → серый
          const circleBorder = isActive
            ? colors.primary
            : isToday
            ? colors.primary
            : colors.border;
          const circleBg = isActive
            ? colors.primaryDim
            : 'transparent';

          return (
            <View key={day.date} style={styles.dayItem}>
              <View style={[
                styles.dayCircle,
                {
                  borderWidth: isToday || isActive ? 2 : 1.5,
                  borderColor: circleBorder,
                  backgroundColor: circleBg,
                },
              ]}>
                {isActive && (
                  <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />
                )}
                {isToday && !isActive && (
                  <View style={[styles.dayDot, { backgroundColor: colors.primary, opacity: 0.45 }]} />
                )}
              </View>
              <Text style={[
                styles.dayLabel,
                {
                  color: isActive
                    ? colors.primary
                    : isToday
                    ? colors.primary
                    : isFuture
                    ? colors.border
                    : colors.muted,
                  fontFamily: isToday || isActive ? fonts.bold : fonts.regular,
                },
              ]}>
                {day.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface CircleProps {
  value: number;
  label: string;
  color: string;
  bg: string;
  colors: any;
  icon?: React.ReactNode;
}

const StatCircle = ({ value, label, color, bg, colors, icon }: CircleProps) => (
  <View style={styles.circleItem}>
    <View style={[styles.circle, { backgroundColor: bg, borderColor: color, borderWidth: 2 }]}>
      {icon ? (
        <View style={styles.iconInCircle}>
          {icon}
          <Text style={[styles.circleValue, { color }]}>{value}</Text>
        </View>
      ) : (
        <Text style={[styles.circleValue, { color }]}>{value}</Text>
      )}
    </View>
    <Text style={[styles.circleLabel, { color: colors.muted }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  circleItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInCircle: {
    alignItems: 'center',
    gap: 1,
  },
  circleValue: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
  },
  circleLabel: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    textAlign: 'center',
    maxWidth: 80,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  dayItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: typography.small,
  },
});
