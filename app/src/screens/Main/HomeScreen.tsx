import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, radii } from '../../theme';

export const HomeScreen = () => {
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ваши группы</Text>
      <Text style={styles.subtitle}>Здесь будут группы слов и тренировки.</Text>

      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: 'auto',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.muted,
    fontSize: typography.body,
  },
});

