import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { useTheme, spacing, typography, fonts, radii } from '../../theme';

interface Props {
  onCreatePress: () => void;
}

export const GroupEmptyState = ({ onCreatePress }: Props) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <BookOpen color={colors.muted} size={56} strokeWidth={1.5} />
      <Text style={[styles.title, { color: colors.text }]}>Нет словарей</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Создайте первый словарь, чтобы начать учить слова
      </Text>
      <Pressable
        onPress={onCreatePress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.primary,
            boxShadow: Platform.OS === 'web'
              ? `0px 8px 16px ${colors.primary}50`
              : undefined,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 8,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Создать первый словарь"
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          Создать словарь
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
  },
});
