import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Crown, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

export const PremiumThankYouScreen = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.lg }]}>
      <LinearGradient
        colors={isDark ? ['#0EA5E9', '#6366F1', '#8B5CF6'] : ['#0284C7', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroIconWrap}>
          <Crown color="#fff" size={34} />
        </View>
        <Text style={styles.heroTitle}>Спасибо за Premium!</Text>
        <Text style={styles.heroSubtitle}>
          Вы поддержали развитие SmartWord. Все Premium-возможности уже активны.
        </Text>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <CheckCircle2 color={colors.primary} size={20} />
          <Text style={[styles.rowText, { color: colors.text }]}>Безлимитные словари и слова открыты</Text>
        </View>
        <View style={styles.row}>
          <CheckCircle2 color={colors.primary} size={20} />
          <Text style={[styles.rowText, { color: colors.text }]}>AI-чат работает без ограничений</Text>
        </View>
        <View style={styles.row}>
          <Sparkles color={colors.primary} size={20} />
          <Text style={[styles.rowText, { color: colors.text }]}>Новые функции будут доступны вам первыми</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.primary, marginBottom: insets.bottom + spacing.lg }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Перейти в профиль</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: fonts.black,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: typography.body,
    fontFamily: fonts.medium,
    lineHeight: 22,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    fontSize: typography.body,
    fontFamily: fonts.medium,
    lineHeight: 22,
  },
  ctaButton: {
    borderRadius: radii.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: typography.body,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
});
