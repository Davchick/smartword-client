import React from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme, spacing, typography, fonts, radii } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle | ViewStyle[];
  leftIcon?: React.ReactNode;
};

export const Button: React.FC<Props> = ({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
  leftIcon,
}) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const baseStyle =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'ghost'
        ? styles.ghost
        : styles.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        baseStyle,
        {
          borderRadius: radii.full,
        },
        variant === 'primary' && {
          backgroundColor: colors.primary,
        },
        variant === 'secondary' && {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.textSecondary} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.title,
              {
                color: variant === 'primary' ? colors.background : colors.text,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  primary: {},
  secondary: {
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
  },
});

