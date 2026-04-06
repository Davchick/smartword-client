import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, spacing, typography, radii } from '../../theme';

export const HomeScreen = () => {
  const { signOut } = useAuth();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Ваши группы</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>Здесь будут группы слов и тренировки.</Text>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.card }]} onPress={() => signOut()}>
        <Text style={[styles.buttonText, { color: colors.muted }]}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: 'auto',
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.body,
  },
});

