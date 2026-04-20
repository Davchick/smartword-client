import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Linking,
  AppState,
} from 'react-native';
import WebView from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Crown, ChevronLeft, Zap, MessageCircle, BookOpen, Sparkles, CreditCard, ExternalLink, FileText, Shield, Check, ArrowRight, RotateCcw, X } from 'lucide-react-native';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
import { useToast } from '../../components/Toast';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import type { ApiProfile } from '../../contexts/AuthContext';
import { createSubscriptionPayment, getPaymentStatus, type PlanId, type PaymentMethod } from '../../lib/billing';
import { queryKey, invalidateGroups, invalidateProfile, invalidateStats, invalidateStreaks, invalidateWords } from '../../lib/queryKeys';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// SVG иконки — имена с заглавной буквы (требование React)
// @ts-ignore
import SbpIcon from '../../../assets/icons/SBP.svg';
// @ts-ignore
import SberIcon from '../../../assets/icons/sber.svg';
// @ts-ignore
import TbankIcon from '../../../assets/icons/tbank.svg';

// --- Данные тарифов с расчётом выгоды ---
const PLANS: {
  id: PlanId;
  title: string;
  price: string;
  description: string;
  highlight?: boolean;
  savings?: string;
  perMonth?: string;
}[] = [
  {
    id: 'month',
    title: '1 месяц',
    price: '299 ₽',
    description: 'Попробовать всё',
  },
  {
    id: 'half_year',
    title: '6 месяцев',
    price: '1 699 ₽',
    description: 'Экономия 95 ₽',
    savings: '-5%',
    perMonth: '~283 ₽/мес',
  },
  {
    id: 'year',
    title: '12 месяцев',
    price: '3 169 ₽',
    description: 'Максимальная выгода',
    highlight: true,
    savings: '-12%',
    perMonth: '~264 ₽/мес',
  },
];

const METHODS: { id: PaymentMethod; label: string; sublabel?: string }[] = [
  { id: 'card', label: 'Банковская карта', sublabel: 'Visa, MasterCard, МИР' },
  { id: 'sbp', label: 'СБП', sublabel: 'Быстрый перевод' },
  { id: 'sberpay', label: 'СберПэй', sublabel: 'Онлайн' },
  { id: 'tpay', label: 'T-Pay', sublabel: 'Онлайн' },
];

const BENEFITS = [
  { icon: BookOpen, title: 'Все словари', desc: 'Создавайте словари без ограничений', color: '#38BDF8' },
  { icon: Zap, title: 'Слова без лимита', desc: 'Повторяйте сколько угодно', color: '#F59E0B' },
  { icon: MessageCircle, title: 'AI-чат с Лекси', desc: 'Живой диалог 24/7', color: '#8B5CF6' },
  { icon: Sparkles, title: 'Ранний доступ', desc: 'Новые функции первыми', color: '#10B981' },
];

export const PaymentScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile, refetch: refetchProfile } = useProfile();
  const { showToast } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('year');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [isWebViewVisible, setIsWebViewVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'timeout'>('idle');
  const paymentFinalizedRef = useRef(false);
  const paymentStatusRef = useRef<'idle' | 'processing' | 'timeout'>('idle');
  const activePaymentIdRef = useRef<string | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);
  const pollStartedAtRef = useRef(0);
  const isPollingRef = useRef(false);
  const goToProfileWithThankYou = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    isPollingRef.current = false;

    // Гарантированно закрываем paywall-экран и открываем профиль + экран благодарности
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'Main',
            params: { screen: 'ProfileTab' },
          },
          { name: 'PremiumThankYou' },
        ],
      }),
    );
  }, [navigation]);


  // Анимация scale для выбранного тарифа
  const [planScales, setPlanScales] = useState<Record<PlanId, Animated.Value>>(() => ({
    month: new Animated.Value(1),
    half_year: new Animated.Value(1),
    year: new Animated.Value(1),
  }));

  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);
  useEffect(() => {
    activePaymentIdRef.current = activePaymentId;
  }, [activePaymentId]);


  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;
  const isPremiumActive = profile?.is_premium;

  const expiresText = useMemo(() => {
    if (!profile?.subscription_expires_at) return null;
    const d = new Date(profile.subscription_expires_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [profile?.subscription_expires_at]);

  const animatePlanScale = (planId: PlanId) => {
    Animated.sequence([
      Animated.timing(planScales[planId], { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(planScales[planId], { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handlePlanSelect = (planId: PlanId) => {
    animatePlanScale(planId);
    setSelectedPlan(planId);
  };

  const finalizeSuccessfulPayment = useCallback(async () => {
    if (paymentFinalizedRef.current) return;
    paymentFinalizedRef.current = true;

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    isPollingRef.current = false;

    setIsWebViewVisible(false);
    setWebViewUrl(null);
    setActivePaymentId(null);

    // Мгновенно меняем состояние приложения на Premium даже до refetch.
    queryClient.setQueryData(queryKey.profile.me(), (prev: any) =>
      prev ? { ...prev, is_premium: true } : prev,
    );
    const freshProfile = queryClient.getQueryData<ApiProfile>(queryKey.profile.me());
    if (freshProfile) {
      setUser({ ...freshProfile, is_premium: true });
    } else if (user) {
      setUser({ ...user, is_premium: true });
    }

    // ВАЖНО для UX: сначала уходим с этого экрана, чтобы не показывать
    // промежуточный "Premium активен" блок из PaymentScreen.
    goToProfileWithThankYou();

    Promise.allSettled([
      invalidateProfile(queryClient),
      invalidateWords(queryClient),
      invalidateGroups(queryClient),
      invalidateStats(queryClient),
      invalidateStreaks(queryClient),
      refetchProfile(),
    ]).catch(() => {
      // Фоновая синхронизация не должна ломать навигационный флоу после оплаты.
    });

    showToast('Подписка активирована', 'success');
  }, [goToProfileWithThankYou, queryClient, refetchProfile, setUser, showToast, user]);

  const handleActivate = async () => {
    setError(null);
    setLoading(true);
    paymentFinalizedRef.current = false;
    try {
      const {
        payment_id,
        confirmation_url,
        payment_method_type,
        requested_payment_method_type,
      } = await createSubscriptionPayment(selectedPlan, selectedMethod);

      const expectedMethodType = selectedMethod === 'card' ? 'bank_card' : requested_payment_method_type;
      const hasMismatch =
        !!expectedMethodType &&
        expectedMethodType !== 'bank_card' &&
        !!payment_method_type &&
        payment_method_type !== expectedMethodType;

      if (hasMismatch) {
        setError('Выбранный способ оплаты сейчас недоступен. Попробуйте другой вариант.');
        showToast('Способ оплаты временно недоступен', 'info');
        return;
      }

      if (confirmation_url) {
        // Все методы обрабатываем внутри приложения через WebView.
        setActivePaymentId(payment_id);
        pollAttemptRef.current = 0;
        pollStartedAtRef.current = 0;
        setPaymentStatus('idle');
        setWebViewUrl(confirmation_url);
        setIsWebViewVisible(true);
      } else {
        setError('Не удалось получить ссылку на оплату. Попробуйте позже.');
      }
    } catch (e) {
      const message =
        e &&
        typeof e === 'object' &&
        'body' in e &&
        (e as any).body &&
        typeof (e as any).body === 'object' &&
        (e as any).body.error === 'payment_method_unavailable'
          ? 'Этот способ оплаты сейчас недоступен. Выберите другой и попробуйте снова.'
          : 'Ошибка при создании платежа. Проверьте интернет и попробуйте ещё раз.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resolvePaymentState = useCallback((url: string) => {
    try {
      const parsed = new URL(url.toLowerCase());
      const hash = parsed.hash;
      const pathname = parsed.pathname || '';

      const isSuccess =
        hash === '#/payment/success' ||
        hash === '#/payment/success/' ||
        pathname.endsWith('/payment/success') ||
        pathname.endsWith('/payment/success/') ||
        parsed.searchParams.get('result') === 'success' ||
        parsed.searchParams.get('status') === 'succeeded';
      const isCancel = parsed.searchParams.get('cancel') === 'true' || parsed.searchParams.get('result') === 'cancel' || parsed.searchParams.get('result') === 'failed';

      return { isSuccess, isCancel };
    } catch {
      return { isSuccess: false, isCancel: false };
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const scheduleNextPoll = useCallback((delayMs: number, run: () => Promise<void>) => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollingTimeoutRef.current = setTimeout(() => {
      run().catch(() => {
        // Ошибки обрабатываются внутри poller, чтобы не ронять UI.
      });
    }, delayMs);
  }, []);

  const runPaymentPolling = useCallback(async () => {
    const paymentId = activePaymentIdRef.current;
    if (!paymentId || paymentFinalizedRef.current) {
      stopPolling();
      return;
    }

    if (!isPollingRef.current) return;

    const maxAttempts = 8;
    const maxDurationMs = 90_000;
    const backoffMs = [1200, 2000, 3000, 5000, 8000, 12000, 15000, 18000];

    if (!pollStartedAtRef.current) {
      pollStartedAtRef.current = Date.now();
    }

    const elapsed = Date.now() - pollStartedAtRef.current;
    if (pollAttemptRef.current >= maxAttempts || elapsed > maxDurationMs) {
      stopPolling();
      setPaymentStatus('timeout');
      showToast('Оплата обрабатывается. Проверьте статус через несколько минут.', 'info');
      return;
    }

    pollAttemptRef.current += 1;
    setPaymentStatus('processing');

    try {
      const payment = await getPaymentStatus(paymentId);
      if (payment.status === 'succeeded' || payment.is_premium) {
        await finalizeSuccessfulPayment();
        return;
      }
      if (payment.status === 'canceled') {
        stopPolling();
        setPaymentStatus('idle');
        showToast('Оплата отменена. Попробуйте ещё раз.', 'info');
        return;
      }
    } catch {
      // Сетевые ошибки не прерывают опрос, продолжаем с backoff.
    }

    const nextDelay = backoffMs[Math.min(pollAttemptRef.current, backoffMs.length - 1)] ?? 18000;
    scheduleNextPoll(nextDelay, runPaymentPolling);
  }, [finalizeSuccessfulPayment, scheduleNextPoll, showToast, stopPolling]);

  const startPolling = useCallback((reason: 'return' | 'deeplink' | 'foreground') => {
    if (paymentFinalizedRef.current || !activePaymentIdRef.current) return;
    if (reason === 'return') {
      pollAttemptRef.current = 0;
      pollStartedAtRef.current = Date.now();
    }
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    runPaymentPolling().catch(() => {
      stopPolling();
      setPaymentStatus('timeout');
    });
  }, [runPaymentPolling, stopPolling]);

  const handleWebViewRequest = useCallback((request: { url?: string }) => {
    const url = request.url || '';
    if (!url) return true;

    const lower = url.toLowerCase();
    const isHttp = lower.startsWith('http://') || lower.startsWith('https://');
    if (isHttp) return true;

    // Android WebView часто отдаёт deeplink в intent://... с fallback внутри параметра.
    if (lower.startsWith('intent://')) {
      const fallbackMatch = url.match(/[?&]browser_fallback_url=([^&]+)/i);
      const encodedFallback = fallbackMatch?.[1];
      const fallbackUrl = encodedFallback ? decodeURIComponent(encodedFallback) : null;
      if (fallbackUrl && /^https?:\/\//i.test(fallbackUrl)) {
        setWebViewUrl(fallbackUrl);
        return false;
      }
    }

    // Обрабатываем банковские deep links без открытия браузера.
    Linking.openURL(url).catch(() => {
      showToast('Не удалось открыть банковское приложение', 'info');
    });
    startPolling('deeplink');
    return false;
  }, [showToast, startPolling]);

  const handleWebViewClose = useCallback((wasSuccess?: boolean, shouldPoll?: boolean) => {
    setIsWebViewVisible(false);
    setWebViewUrl(null);
    if (shouldPoll === true && wasSuccess) {
      startPolling('return');
    }
  }, [startPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Когда пользователь возвращается в приложение после внешней оплаты (SBP/SberPay/T-Pay),
  // сразу делаем проверку статуса и при необходимости поднимаем polling.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || paymentFinalizedRef.current) return;
      if (paymentStatusRef.current !== 'processing') return;
      startPolling('foreground');
    });
    return () => sub.remove();
  }, [startPolling]);

  const handleGoToMain = useCallback(() => {
    stopPolling();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  }, [navigation, stopPolling]);

  const handleNavigationStateChange = useCallback((navState: { url?: string }) => {
    const url = navState.url || '';
    if (!url) return;
    const { isSuccess, isCancel } = resolvePaymentState(url);
    if (isSuccess) {
      // Всегда закрываем WebView сразу, даже если URL распознался раньше webhook.
      handleWebViewClose(true, true);
    } else if (isCancel) {
      handleWebViewClose(false, false);
      showToast('Оплата отменена. Попробуйте ещё раз.', 'info');
    }
  }, [handleWebViewClose, resolvePaymentState, showToast]);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleOpenLegal = async (docType: 'terms' | 'privacy') => {
    const url = docType === 'terms'
      ? 'https://smart-word.ru/terms'
      : 'https://smart-word.ru/privacy';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast(`Не удалось открыть ссылку: ${url}`, 'info');
      }
    } catch (error) {
      console.error('Error opening legal document:', error);
    }
  };

  // Градиенты для hero
  const gradientColors: readonly [string, string, ...string[]] = isDark
    ? ['#0EA5E9', '#6366F1', '#8B5CF6']
    : ['#0284C7', '#4F46E5', '#7C3AED'];

  // Фоновый градиент для экрана
  const bgGradient: readonly [string, string, ...string[]] = isDark
    ? ['#020617', '#0F172A', '#020617']
    : ['#F8FAFC', '#EFF6FF', '#F8FAFC'];

  const MethodIcon = ({ methodId, selected }: { methodId: PaymentMethod; selected: boolean }) => {
    if (methodId === 'card') {
      return <CreditCard color={selected ? colors.primary : colors.muted} size={20} />;
    }
    if (methodId === 'sbp') {
      return <SbpIcon width={28} height={28} />;
    }
    if (methodId === 'sberpay') {
      return <SberIcon width={28} height={28} />;
    }
    return <TbankIcon width={28} height={28} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Фоновый градиент */}
      <LinearGradient
        colors={bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Premium</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ===== HERO СЕКЦИЯ (компактнее) ===== */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { shadowColor: gradientColors[1] }]}
        >
          {/* Декоративные круги */}
          <View style={[styles.heroDecoration, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
          <View style={[styles.heroDecoration2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

          <View style={styles.heroContent}>
            <View style={styles.heroIconRow}>
              <Crown color="#fff" size={20} />
              <Text style={styles.heroIconText}>Premium</Text>
            </View>

            <Text style={styles.heroTitle}>Разблокируйте всё</Text>
            <Text style={styles.heroSubtitle}>
              {isPremiumActive
                ? 'Спасибо за поддержку! 💙'
                : 'Безлимитные словари, слова и AI-чат'}
            </Text>

            {expiresText && !isPremiumActive && (
              <View style={styles.expiresBadge}>
                <RotateCcw color="rgba(255,255,255,0.8)" size={12} />
                <Text style={styles.expiresBadgeText}>Действует до {expiresText}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {!isPremiumActive && (
          <>
            {/* ===== ЧТО ДАЁТ ПОДПИСКА (перенесено вверх, сразу после hero) ===== */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Что даёт подписка</Text>
            <View style={styles.benefitsGrid}>
              {BENEFITS.map(({ icon: Icon, title, desc, color }, i) => (
                <View key={i} style={[styles.benefitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.benefitIconWrap, { backgroundColor: color + '18' }]}>
                    <Icon color={color} size={20} />
                  </View>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.benefitDesc, { color: colors.muted }]}>{desc}</Text>
                </View>
              ))}
            </View>

            {/* ===== ТАРИФЫ (вертикальный список вместо горизонтального скролла) ===== */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Выберите тариф</Text>
            <View style={styles.plansList}>
              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.id;
                const AnimatedPlanCard = Animated.View;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.9}
                    onPress={() => handlePlanSelect(plan.id)}
                  >
                    <AnimatedPlanCard
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: selected
                            ? isDark ? '#1E293B' : '#FFFFFF'
                            : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                          borderWidth: selected ? 2 : 1,
                          transform: [{ scale: planScales[plan.id] }],
                        },
                        selected && styles.planCardSelected,
                      ]}
                    >
                      {plan.highlight && (
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeText}>🔥 Лучший выбор</Text>
                        </View>
                      )}
{plan.savings && !plan.highlight && (
                        <View style={[styles.planBadge, styles.planBadgeSecondary]}>
                          <Text style={styles.planBadgeText}>{plan.savings} экономия</Text>
                        </View>
                      )}

                      <View style={styles.planContent}>
                        <View style={styles.planLeft}>
                          <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                          {plan.perMonth && (
                            <Text style={[styles.planPerMonth, { color: colors.muted }]}>{plan.perMonth}</Text>
                          )}
                        </View>
                        <View style={styles.planRight}>
                          <Text style={[styles.planPrice, { color: selected ? colors.primary : colors.text }]}>
                            {plan.price}
                          </Text>
                          {selected && (
                            <View style={[styles.planCheck, { backgroundColor: colors.primary }]}>
                              <Check color="#fff" size={14} strokeWidth={3} />
                            </View>
                          )}
                        </View>
                      </View>

                      <Text style={[styles.planDescription, { color: colors.muted }]}>{plan.description}</Text>
                    </AnimatedPlanCard>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ===== СПОСОБ ОПЛАТЫ (улучшенный дизайн) ===== */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Способ оплаты</Text>
            <View style={[styles.methodsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {METHODS.map((method, index) => {
                const selected = selectedMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodRow,
                      {
                        backgroundColor: selected
                          ? isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)'
                          : 'transparent',
                      },
                      selected && styles.methodRowSelected,
                    ]}
                    onPress={() => setSelectedMethod(method.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.methodIconWrap,
                      {
                        backgroundColor: selected
                          ? isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.12)'
                          : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: selected ? colors.primary : 'transparent',
                        borderWidth: selected ? 1.5 : 0,
                        marginRight: 9,
                        ...(method.id === 'tpay' ? { paddingLeft: 3 } : {}),
                      },
                    ]}>
                      <MethodIcon methodId={method.id} selected={selected} />
                    </View>
                    <View style={styles.methodTextWrap}>
                      <Text
                        style={[
                          styles.methodLabel,
                          { color: selected ? colors.primary : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {method.label}
                      </Text>
                      {method.sublabel && (
                        <Text style={[styles.methodSublabel, { color: colors.muted }]} numberOfLines={1}>
                          {method.sublabel}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.methodRadio, {
                      borderColor: selected ? colors.primary : colors.border,
                    }]}>
                      {selected && (
                        <View style={[styles.methodRadioDot, { backgroundColor: colors.primary }]}>
                          <Check color={isDark ? '#020617' : '#fff'} size={10} strokeWidth={3} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ===== ЮРИДИЧЕСКАЯ ИНФОРМАЦИЯ ===== */}
            <Text style={[styles.sectionSubTitle, { color: colors.muted }]}>Документы</Text>
            <View style={styles.legalBlock}>
              <TouchableOpacity
                style={[styles.legalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleOpenLegal('terms')}
                activeOpacity={0.7}
              >
                <View style={[styles.legalIconWrap, { backgroundColor: colors.primaryDim }]}>
                  <FileText color={colors.primary} size={16} />
                </View>
                <Text style={[styles.legalLabel, { color: colors.text }]}>Условия использования</Text>
                <ExternalLink color={colors.muted} size={14} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.legalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleOpenLegal('privacy')}
                activeOpacity={0.7}
              >
                <View style={[styles.legalIconWrap, { backgroundColor: colors.primaryDim }]}>
                  <Shield color={colors.primary} size={16} />
                </View>
                <Text style={[styles.legalLabel, { color: colors.text }]}>Политика конфиденциальности</Text>
                <ExternalLink color={colors.muted} size={14} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Если Premium уже активен */}
        {isPremiumActive && (
          <View style={[styles.premiumActiveBlock, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Crown color={colors.primary} size={28} />
            <Text style={[styles.premiumActiveTitle, { color: colors.text }]}>Premium активен</Text>
            <Text style={[styles.premiumActiveDesc, { color: colors.muted }]}>
              У вас уже есть доступ ко всем функциям. Спасибо за поддержку! 💙
            </Text>
          </View>
        )}
      </ScrollView>

      {isWebViewVisible && webViewUrl && (
        <View style={[styles.webViewContainer, { paddingTop: insets.top }]}>
          <View style={[styles.webViewHeader, { backgroundColor: colors.card }]}>
            <Text style={[styles.webViewTitle, { color: colors.text }]}>Оплата</Text>
            <TouchableOpacity
              onPress={() => {
                handleWebViewClose(false, false);
              }}
              style={styles.webViewCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X color={colors.muted} size={22} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: webViewUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartWithLoadRequest={handleWebViewRequest}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            allowsBackForwardNavigationGestures={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            cacheEnabled={true}
            allowFileAccess={false}
            injectedJavaScript={`
              (function() {
                var lastUrl = window.location.href;

                function notify(url) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'url_change', url: url }));
                }

                var pollInterval = setInterval(function() {
                  if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    notify(lastUrl);
                    clearInterval(pollInterval);
                  }
                }, 100);

                window.addEventListener('hashchange', function() {
                  var newUrl = window.location.href;
                  if (newUrl !== lastUrl) {
                    lastUrl = newUrl;
                    notify(newUrl);
                    clearInterval(pollInterval);
                  }
                });
              })();
              true;
            `}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'url_change' && data.url) {
                  handleNavigationStateChange({ url: data.url });
                }
              } catch (e) {
                if (__DEV__) {
                  console.warn('[PaymentScreen] WebView message parse error:', e);
                }
              }
            }}
          />
        </View>
      )}

      {(paymentStatus === 'processing' || paymentStatus === 'timeout') && (
        <View style={[styles.waitingOverlay, { backgroundColor: colors.background }]}>
          <View style={styles.waitingContent}>
            {paymentStatus === 'processing' && (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.waitingTitle, { color: colors.text }]}>Ожидание подтверждения</Text>
                <Text style={[styles.waitingDesc, { color: colors.muted }]}>
                  Платёж обрабатывается. Это может занять до 40 секунд.
                </Text>
              </>
            )}
            {paymentStatus === 'timeout' && (
              <>
                <View style={[styles.successIcon, { backgroundColor: colors.muted }]}>
                  <Crown color="#fff" size={32} />
                </View>
                <Text style={[styles.waitingTitle, { color: colors.text }]}>Оплата в обработке</Text>
                <Text style={[styles.waitingDesc, { color: colors.muted }]}>
                  Информация о платеже поступит в течение нескольких минут. Если Premium не активируется, обратитесь в поддержку.
                </Text>
                <TouchableOpacity
                  style={[styles.waitingButton, { backgroundColor: colors.primary }]}
                  onPress={handleGoToMain}
                >
                  <Text style={styles.waitingButtonText}>Понятно</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* ===== STICKY CTA КНОПКА (улучшенный дизайн) ===== */}
      {!isPremiumActive && (
        <View style={[styles.stickyFooter, {
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: isDark ? '#0F172AF2' : '#FFFFFFF2',
          borderTopColor: colors.border,
        }]}>
          {error && (
            <Text style={[styles.errorText, { color: colors.danger }]} numberOfLines={2}>{error}</Text>
          )}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              {
                shadowColor: colors.primary,
              },
              loading && styles.ctaButtonDisabled,
            ]}
            onPress={handleActivate}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isDark ? ['#38BDF8', '#818CF8'] : ['#0284C7', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaText}>Оплатить</Text>
                  <View style={styles.ctaDivider} />
                  <Text style={styles.ctaPrice}>{selectedPlanData.price}</Text>
                  <ArrowRight color="#fff" size={20} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Hero — компактный
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecoration: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -25,
    right: -15,
  },
  heroDecoration2: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    bottom: -15,
    left: -10,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroIconText: {
    color: '#fff',
    fontSize: typography.small,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.black,
    color: '#fff',
    marginBottom: spacing.xs,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: typography.body,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  expiresBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  expiresBadgeText: {
    color: '#fff',
    fontSize: typography.xs,
    fontWeight: '600',
  },

  // Section title
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    fontFamily: fonts.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionSubTitle: {
    fontSize: typography.xs,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Benefits — grid 2x2
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  benefitCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: typography.small,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  benefitDesc: {
    fontSize: typography.xs,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Plans — вертикальный список
  plansList: {
    gap: spacing.sm,
  },
  planCard: {
    borderRadius: radii.md,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  planCardSelected: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#F59E0B',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  planBadgeSecondary: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
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
    marginBottom: spacing.xs,
  },
  planLeft: {
    flex: 1,
  },
  planTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  planPerMonth: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planPrice: {
    fontSize: typography.subtitle,
    fontWeight: '800',
    fontFamily: fonts.black,
  },
  planCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDescription: {
    fontSize: typography.small,
  },

  // Methods — карточный дизайн с отступами
  methodsContainer: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
  },
  methodRowSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    paddingLeft: 8,
  },
  methodTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  methodSublabel: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  methodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  methodRadioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Subscription info
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.small,
    lineHeight: 20,
  },

  // Legal
  legalBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  legalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  legalLabel: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },

  // Premium active
  premiumActiveBlock: {
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.xl,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  premiumActiveTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  premiumActiveDesc: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  errorText: {
    fontSize: typography.small,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  ctaButton: {
    borderRadius: radii.full,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ctaText: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: '#fff',
  },
  ctaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  ctaPrice: {
    fontSize: typography.body,
    fontWeight: '800',
    fontFamily: fonts.black,
    color: '#fff',
  },

  webViewContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  webViewTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: '#fff',
  },
  webViewCloseBtn: {
    padding: spacing.xs,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  webViewLoadingText: {
    marginTop: spacing.md,
    fontSize: typography.body,
    color: '#94A3B8',
  },

  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  waitingContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  waitingTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  waitingDesc: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  waitingButtonText: {
    color: '#fff',
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
