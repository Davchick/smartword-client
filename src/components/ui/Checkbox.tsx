import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme, spacing, radii, fonts, typography } from '../../theme';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  size?: number;
}

export const Checkbox = ({ checked, onPress, label, disabled = false, size = 22 }: CheckboxProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View
        style={[
          styles.checkbox,
          {
            width: size,
            height: size,
            borderRadius: radii.sm,
            backgroundColor: checked ? colors.primary : colors.card,
            borderColor: checked ? colors.primary : colors.border,
          },
        ]}
      >
        {checked && (
          <Check
            color={colors.primary === '#000' ? '#000' : '#fff'}
            size={size * 0.6}
            strokeWidth={3}
          />
        )}
      </View>
      {label && (
        <Text
          style={[
            styles.label,
            { color: disabled ? colors.muted : colors.text },
          ]}
          numberOfLines={0}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: typography.small,
    fontFamily: fonts.regular,
    lineHeight: typography.small * 1.4,
  },
});
