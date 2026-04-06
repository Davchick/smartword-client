import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing, typography, fonts, radii } from '../../theme';

type Props = {
  label: string;
  style?: ViewStyle | ViewStyle[];
  leadingIcon?: React.ReactNode;
};

export const Pill: React.FC<Props> = ({ label, style, leadingIcon }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        styles.pill,
        {
          borderRadius: radii.full,
          borderWidth: 1,
          borderColor: colors.border,
          color: colors.textSecondary,
        },
        style as any,
      ]}
    >
      {leadingIcon}
      {label}
    </Text>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: '#e5e7eb',
    overflow: 'hidden',
  },
});

