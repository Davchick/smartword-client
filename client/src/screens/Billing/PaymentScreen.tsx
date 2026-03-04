import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Crown, ChevronLeft, Clock, Send, MessageCircle, BookOpen, Zap, ChevronDown, CreditCard } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import sbpIcon from '../../../assets/icons/SBP.svg';
import sberPayIcon from '../../../assets/icons/sber-pay-simple.svg';
import tpayIcon from '../../../assets/icons/t-pay.svg';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMethods = () => {
    setMethodsOpen(prev => !prev);
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

  const selectedMethodData = METHODS.find((m) => m.id === selectedMethod) || METHODS[0];

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', paddingTop: insets.top + spacing.sm }]}>
      <View style={[styles.header, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleGoBack}
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
            <View style={styles.methodIconWrapper}>
              {selectedMethod === 'card' ? (
                <CreditCard color={colors.primary} size={24} />
              ) : selectedMethod === 'sbp' ? (
                <SvgXml xml={sbpIcon} width={28} height={28} />
              ) : selectedMethod === 'sberpay' ? (
                <SvgXml xml={sberPayIcon} width={28} height={28} />
              ) : (
                <SvgXml xml={tpayIcon} width={28} height={28} />
              )}
            </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodRowLabel, { color: colors.text }]}>
                  {selectedMethodData.label}
                </Text>
                <Text style={[styles.methodRowNote, { color: colors.muted }]} numberOfLines={1}>
                  {selectedMethodData.note}
                </Text>
              </View>
              <ChevronDown
                color={colors.muted}
                size={16}
                style={{ transform: [{ rotate: methodsOpen ? '180deg' : '0deg' }] }}
              />
          </TouchableOpacity>

          {methodsOpen && (
            <View style={styles.dropdownContainer}>
              {Platform.OS === 'ios' ? (
                <BlurView 
                  intensity={100} 
                  tint={colors.text === '#0f172a' ? 'light' : 'dark'} 
                  style={styles.blurContainer}
                  experimentalBlurMethod="dimezisBlurView"
                >
                  <View style={[styles.methodsDropdown, {
                    backgroundColor: colors.text === '#0f172a'
                      ? 'rgba(255, 255, 255, 0.75)'
                      : 'rgba(30, 41, 59, 0.75)',
                    borderColor: (colors.border || '#334155') + '60'
                  }]}>
                    {METHODS.map((method) => {
                      const selected = selectedMethod === method.id;
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.methodRow,
                            selected && styles.methodRowSelected,
                          ]}
                          onPress={() => {
                            setSelectedMethod(method.id);
                            toggleMethods();
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.methodRowIconWrapper, { backgroundColor: selected ? colors.primary + '20' : colors.background }]}>
                            {method.id === 'card' ? (
                              <CreditCard color={selected ? colors.primary : colors.text} size={20} />
                            ) : method.id === 'sbp' ? (
                              <SvgXml xml={sbpIcon} width={20} height={20} />
                            ) : method.id === 'sberpay' ? (
                              <SvgXml xml={sberPayIcon} width={20} height={20} />
                            ) : (
                              <SvgXml xml={tpayIcon} width={20} height={20} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.methodRowLabel,
                                { color: selected ? colors.primary : colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {method.label}
                            </Text>
                            <Text
                              style={[
                                styles.methodRowNote,
                                { color: selected ? colors.primary + '99' : colors.muted },
                              ]}
                              numberOfLines={1}
                            >
                              {method.note}
                            </Text>
                          </View>
                          {selected && (
                            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                              <Text style={styles.checkmarkText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.methodsDropdown, { 
                  backgroundColor: colors.elevated, 
                  borderColor: colors.border,
                  borderWidth: 1,
                }]}>
                  {METHODS.map((method) => {
                    const selected = selectedMethod === method.id;
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.methodRow,
                          selected && styles.methodRowSelected,
                        ]}
                        onPress={() => {
                          setSelectedMethod(method.id);
                          toggleMethods();
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.methodRowIconWrapper}>
                          {method.id === 'card' ? (
                            <CreditCard color={selected ? colors.primary : colors.text} size={24} />
                          ) : method.id === 'sbp' ? (
                            <SvgXml xml={sbpIcon} width={28} height={28} />
                          ) : method.id === 'sberpay' ? (
                            <SvgXml xml={sberPayIcon} width={28} height={28} />
                          ) : (
                            <SvgXml xml={tpayIcon} width={28} height={28} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.methodRowLabel,
                              { color: selected ? colors.primary : colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {method.label}
                          </Text>
                          <Text
                            style={[
                              styles.methodRowNote,
                              { color: selected ? colors.primary + '99' : colors.muted },
                            ]}
                            numberOfLines={1}
                          >
                            {method.note}
                          </Text>
                        </View>
                        {selected && (
                          <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
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
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.55,
              shadowRadius: 20,
              elevation: 10,
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
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'visible',
  },
  methodsCardOpen: {
    marginBottom: spacing.xl * 2,
  },
  methodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  methodIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 100,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  methodsDropdown: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
    borderWidth: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderRadius: radii.md,
  },
  methodRowSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  methodRowIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRowLabel: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  methodRowNote: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
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

