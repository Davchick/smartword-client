import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Crown, ChevronLeft, Clock, Send, MessageCircle, BookOpen, Zap, ChevronDown, CreditCard } from 'lucide-react-native';
import SbpIcon from '../../../assets/icons/SBP.svg';
import SberPayIcon from '../../../assets/icons/sber-pay.svg';
import TPayIcon from '../../../assets/icons/t-pay.svg';
import { useTheme, spacing, radii, typography } from '../../theme';
import { useProfile } from '../../hooks/useProfile';
import { createSubscriptionPayment, type PlanId, type PaymentMethod } from '../../lib/billing';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const PLANS: { id: PlanId; title: string; price: string; description: string }[] = [
  { id: 'month', title: 'Месяц', price: '299 ₽', description: '30 дней полного доступа' },
  { id: 'half_year', title: 'Полгода', price: '1 699 ₽', description: '6 месяцев: выгоднее помесячной оплаты' },
  { id: 'year', title: 'Год', price: '3 169 ₽', description: '365 дней, лучшая цена' },
];

const METHODS: { id: PaymentMethod; label: string; note: string }[] = [
  { id: 'card', label: 'Карта (РФ)', note: 'Банковские карты российских банков' },
  { id: 'sbp', label: 'СБП', note: 'По номеру телефона или QR-коду' },
  { id: 'sberpay', label: 'СберPay', note: 'Оплата через приложение СберБанк Онлайн' },
  { id: 'tpay', label: 'T‑Pay', note: 'Оплата через приложение Тинькофф' },
];

export const PaymentScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('month');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [methodsOpen, setMethodsOpen] = useState(false);
  const methodsAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMethods = () => {
    const next = !methodsOpen;
    setMethodsOpen(next);
    Animated.timing(methodsAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const handleActivate = async () => {
    setError(null);
    setLoading(true);
    try {
      const { confirmation_url } = await createSubscriptionPayment(selectedPlan, selectedMethod);
      if (confirmation_url) {
        await Linking.openURL(confirmation_url);
      } else {
        setError('Не удалось получить ссылку на оплату. Попробуйте позже.');
      }
    } catch (e) {
      setError('Ошибка при создании платежа. Проверьте подключение к интернету и попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const expiresText = (() => {
    if (!profile?.subscription_expires_at) return null;
    const d = new Date(profile.subscription_expires_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  })();

  const selectedMethodMeta = METHODS.find((m) => m.id === selectedMethod) ?? METHODS[0];

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', paddingTop: insets.top + spacing.sm }]}>
      <View style={[styles.header, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft color={colors.muted} size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Оформление подписки</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Оплата через ЮKassa</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              borderColor: colors.primaryDim,
              backgroundColor: colors.card,
            },
          ]}
        >
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primary }]}>
            <Crown color="#0f172a" size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>SmartWord Premium</Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              {profile?.is_premium
                ? 'Спасибо, что поддерживаете SmartWord! Все премиум‑возможности уже активны.'
                : 'Откройте безлимитные словари, AI‑чат и все будущие функции без ограничений.'}
            </Text>
            {expiresText && (
              <View style={styles.expiresRow}>
                <Clock color={colors.muted} size={14} />
                <Text style={[styles.expiresText, { color: colors.muted }]}>
                  Действует до {expiresText}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>СПОСОБ ОПЛАТЫ</Text>
        <View
          style={[
            styles.methodsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            methodsOpen && styles.methodsCardOpen,
          ]}
        >
          <TouchableOpacity
            style={styles.methodSelector}
            onPress={toggleMethods}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIcon, { backgroundColor: colors.primaryDim }]}>
              {selectedMethod === 'card' && <CreditCard color={colors.primary} size={18} />}
              {selectedMethod === 'sbp' && <SbpIcon width={26} height={26} />}
              {selectedMethod === 'sberpay' && <SberPayIcon width={26} height={26} />}
              {selectedMethod === 'tpay' && <TPayIcon width={26} height={26} />}
            </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodLabel, { color: colors.text }]}>
                  {selectedMethodMeta.label}
                </Text>
                <Text style={[styles.methodNote, { color: colors.muted }]} numberOfLines={1}>
                  {selectedMethodMeta.note}
                </Text>
              </View>
              <ChevronDown
                color={colors.muted}
                size={16}
                style={{ transform: [{ rotate: methodsOpen ? '180deg' : '0deg' }] }}
              />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.methodsDropdown,
              {
                opacity: methodsAnim,
                transform: [
                  {
                    translateY: methodsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-4, 4],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={methodsOpen ? 'auto' : 'none'}
          >
              {METHODS.map((method) => {
                const selected = selectedMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodRow,
                      selected && { backgroundColor: colors.primaryDim },
                    ]}
                    onPress={() => {
                      setSelectedMethod(method.id);
                      toggleMethods();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.methodRowLabel,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </Animated.View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ТАРИФ</Text>
        <View style={styles.cardsScroll}>
          {PLANS.map((plan) => {
            const selected = selectedPlan === plan.id;
            const isBest = plan.id === 'year';
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: selected ? colors.primaryDim : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    shadowColor: selected ? colors.primary : 'transparent',
                    shadowOpacity: selected ? 0.35 : 0,
                    shadowRadius: selected ? 18 : 0,
                    shadowOffset: { width: 0, height: selected ? 10 : 0 },
                    elevation: selected ? 8 : 0,
                  },
                  selected && { transform: [{ scale: 1.02 }] },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.88}
              >
                <View style={styles.planHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                    {isBest && (
                      <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.planBadgeText, { color: '#0f172a' }]}>Лучшая цена</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.planPrice,
                      { color: selected ? colors.primary : colors.text },
                    ]}
                  >
                    {plan.price}
                  </Text>
                </View>
                <Text style={[styles.planDescription, { color: colors.muted }]}>
                  {plan.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

          <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Что даёт подписка</Text>
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primaryDim }]}>
                <BookOpen color={colors.primary} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Все словари без ограничений</Text>
                <Text style={[styles.benefitText, { color: colors.muted }]}>
                  Создавайте сколько угодно тематических подборок слов и фраз.
                </Text>
              </View>
            </View>
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primaryDim }]}>
                <Zap color={colors.primary} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Неограниченное количество слов</Text>
                <Text style={[styles.benefitText, { color: colors.muted }]}>
                  Добавляйте новые слова без лимитов и развивайте активный словарный запас.
                </Text>
              </View>
            </View>
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primaryDim }]}>
                <MessageCircle color={colors.primary} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Безлимитный AI-чат с Лекси</Text>
                <Text style={[styles.benefitText, { color: colors.muted }]}>
                  Практикуйте язык в живом диалоге без счётчика сообщений и жёстких ограничений.
                </Text>
              </View>
            </View>
          </View>

        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.activateBtn,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
            loading && styles.activateBtnDisabled,
          ]}
          onPress={handleActivate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <>
              <Send color="#0f172a" size={18} />
              <Text style={[styles.activateText, { color: '#0f172a' }]}>Активировать подписку</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.helperText, { color: colors.muted }]}>
          После оплаты вернитесь в приложение. Подписка обновится автоматически в течение пары секунд
          после обработки платежа ЮKassa.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  heroText: {
    fontSize: typography.small,
  },
  expiresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  expiresText: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  cardsScroll: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  planCard: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  planTitle: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  planDescription: {
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  planBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
  },
  methodsCard: {
    position: 'relative',
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  methodsCardOpen: {
    marginBottom: spacing.lg * 1.5,
  },
  methodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  methodsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(15,23,42,0.97)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 16,
    zIndex: 20,
  },
  methodRow: {
    paddingVertical: spacing.xs,
  },
  methodIcon: {
    width: 30,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  methodNote: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  methodRowLabel: {
    fontSize: typography.body,
    fontWeight: '500',
  },
  methodRowNote: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.small,
  },
  activateBtn: {
    marginTop: spacing.lg,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  activateBtnDisabled: {
    opacity: 0.7,
  },
  activateText: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  helperText: {
    fontSize: typography.xs,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  benefitsCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.small,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitTitle: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  benefitText: {
    fontSize: typography.xs,
    marginTop: 2,
  },
});

