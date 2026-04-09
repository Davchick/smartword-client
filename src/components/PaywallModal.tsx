import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Crown, Zap, MessageCircle, BookOpen, Check, ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme, spacing, radii, typography, fonts } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  reason: 'groups' | 'words' | 'chat';
  onPurchaseSuccess?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REASON_TITLES: Record<Props['reason'], string> = {
  groups: 'Лимит бесплатных словарей',
  words: 'Лимит бесплатных слов',
  chat: 'Лимит AI-чата',
};

const FEATURES = [
  { icon: BookOpen, text: 'Все словари без ограничений' },
  { icon: Zap, text: 'Неограниченные слова' },
  { icon: MessageCircle, text: 'Безлимитный AI-чат с Лекси' },
  { icon: Sparkles, text: 'Ранний доступ к новым функциям' },
];

const PLANS = [
  { id: 'month', title: '1 мес', price: '299 ₽', badge: null },
  { id: 'half_year', title: '6 мес', price: '1 699 ₽', badge: '-5%' },
  { id: 'year', title: '12 мес', price: '3 169 ₽', badge: '🔥 Выгодно' },
];

export const PaywallModal = ({ visible, onClose, reason, onPurchaseSuccess }: Props) => {
  const { colors, isDark } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('year');
  const [purchasing, setPurchasing] = useState(false);

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;

  const gradientColors: readonly [string, string, ...string[]] = isDark
    ? ['#0EA5E9', '#6366F1', '#8B5CF6']
    : ['#0284C7', '#4F46E5', '#7C3AED'];

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      // TODO: Интеграция с ЮKassa — здесь будет:
      // 1. Вызов createSubscriptionPayment(selectedProduct, method) из lib/billing
      // 2. Получение confirmation_url от ЮKassa
      // 3. Открытие web-страницы оплаты
      // 4. Обработка returnUrl и подтверждение оплаты
      // 5. Вызов onPurchaseSuccess() при успешной оплате
      Alert.alert(
        'Premium скоро будет доступен',
        'Оплата через ЮKassa находится в разработке. Следите за обновлениями!',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err) {
      console.error('[Paywall] Purchase error:', err);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X color={colors.muted} size={22} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Hero */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroCard, { shadowColor: gradientColors[1] }]}
            >
              <View style={[styles.heroDecoration, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={styles.heroIconCircle}>
                <Crown color="#fff" size={28} />
              </View>
              <Text style={styles.heroTitle}>SmartWord Premium</Text>
              <Text style={styles.heroSubtitle}>{REASON_TITLES[reason]}</Text>
              <Text style={styles.heroDescription}>
                Разблокируйте все возможности — словари, слова и AI-чат без лимитов.
              </Text>
            </LinearGradient>

            {/* Features */}
            <View style={styles.featuresBlock}>
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIconWrap, { backgroundColor: colors.primaryDim }]}>
                    <Check color={colors.primary} size={16} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
                </View>
              ))}
            </View>

            {/* Plans */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Тариф</Text>
            <View style={styles.plansBlock}>
              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: selected
                          ? isDark ? '#1E293B' : '#FFFFFF'
                          : colors.elevated,
                        borderColor: selected ? colors.primary : colors.border,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedPlan(plan.id)}
                    activeOpacity={0.85}
                  >
                    {plan.badge && (
                      <View style={[
                        styles.planBadge,
                        { backgroundColor: plan.badge.includes('🔥') ? '#F59E0B' : '#10B981' },
                      ]}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <View style={styles.planContent}>
                      <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                      <Text style={[styles.planPrice, { color: selected ? colors.primary : colors.text }]}>
                        {plan.price}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.purchaseButton, { shadowColor: colors.primary }]}
              onPress={handlePurchase}
              disabled={purchasing}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDark ? ['#38BDF8', '#818CF8'] : ['#0284C7', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.purchaseButtonGradient}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.ctaContent}>
                    <Text style={styles.ctaText}>Оплатить</Text>
                    <Text style={styles.ctaPrice}>{selectedPlanData.price}</Text>
                    <ArrowRight color="#fff" size={18} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.7)',
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
    padding: spacing.xs,
  },

  // Hero
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.lg,
  },
  heroDecoration: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -25,
    right: -15,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.subtitle,
    fontWeight: '800',
    fontFamily: fonts.black,
    color: '#fff',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  heroDescription: {
    fontSize: typography.small,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Features
  featuresBlock: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: typography.small,
    flex: 1,
    fontWeight: '500',
  },

  // Plans
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  plansBlock: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  planCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    position: 'absolute',
    top: -8,
    right: 10,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    zIndex: 1,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  planTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  planPrice: {
    fontSize: typography.body,
    fontWeight: '800',
    fontFamily: fonts.black,
  },

  // CTA
  purchaseButton: {
    borderRadius: radii.full,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: spacing.md,
  },
  purchaseButtonGradient: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaText: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: '#fff',
  },
  ctaPrice: {
    fontSize: typography.body,
    fontWeight: '800',
    fontFamily: fonts.black,
    color: '#fff',
  },
});
