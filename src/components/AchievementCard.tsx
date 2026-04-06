import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing, typography, fonts, radii } from '../theme';
import { Achievement } from '../types/achievements';

type Props = {
  achievement: Achievement;
  style?: ViewStyle | ViewStyle[];
};

export const AchievementCard: React.FC<Props> = ({ achievement, style }) => {
  const { colors, isDark } = useTheme();
  
  const progress = Math.min(1, achievement.progress / achievement.threshold);
  const isUnlocked = achievement.unlocked;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isUnlocked ? colors.card : colors.card + '80',
          borderColor: isUnlocked ? colors.primary : colors.border,
          borderWidth: isUnlocked ? 2 : 1,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isUnlocked ? colors.primary + '20' : colors.surface,
            },
          ]}
        >
          <Text style={styles.icon}>{achievement.icon}</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              {
                color: isUnlocked ? colors.text : colors.textSecondary,
              },
            ]}
          >
            {achievement.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {achievement.description}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: isUnlocked ? colors.primary : colors.textSecondary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {achievement.progress} / {achievement.threshold}
          </Text>
        </View>
        
        {isUnlocked && (
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              +{achievement.points} pts
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  description: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  progressText: {
    fontSize: typography.xsmall,
    fontFamily: fonts.medium,
    minWidth: 50,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginLeft: spacing.sm,
  },
  badgeText: {
    fontSize: typography.xsmall,
    fontFamily: fonts.bold,
  },
});
