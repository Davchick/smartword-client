import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing, typography, fonts, radii } from '../theme';

type Props = {
  streak: number;
  longestStreak?: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle | ViewStyle[];
};

export const StreakCounter: React.FC<Props> = ({
  streak,
  longestStreak = 0,
  size = 'medium',
  style,
}) => {
  const { colors, isDark } = useTheme();

  const sizes = {
    small: { icon: 20, current: 20, label: 12 },
    medium: { icon: 32, current: 32, label: 14 },
    large: { icon: 48, current: 48, label: 16 },
  };

  const s = sizes[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.main}>
        <Text style={{ fontSize: s.icon }}>{streak > 0 ? '🔥' : '💤'}</Text>
        <View style={styles.countContainer}>
          <Text
            style={[
              styles.count,
              {
                fontSize: s.current,
                color: streak > 0 ? colors.primary : colors.textSecondary,
              },
            ]}
          >
            {streak}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: s.label }]}>
            {streak === 1 ? 'день' : streak > 1 && streak < 5 ? 'дня' : 'дней'}
          </Text>
        </View>
      </View>

      {longestStreak > 0 && streak > 0 && (
        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary, fontSize: s.label }]}>
            Лучшая серия: <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>{longestStreak}</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  count: {
    fontFamily: fonts.bold,
  },
  label: {
    fontFamily: fonts.regular,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  footerLabel: {
    fontFamily: fonts.medium,
  },
});
