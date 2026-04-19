import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import WebView from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Crown, Zap, MessageCircle, BookOpen, Check, ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme, spacing, radii, typography, fonts } from '../theme';
import { createSubscriptionPayment, getSubscriptionStatus } from '../lib/billing';
import { useToast } from './Toast';
import { invalidateProfile } from '../lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  visible: boolean;
  onClose: () => void;
  reason: 'groups' | 'words' | 'chat';
  onPurchaseSuccess?: () => void;
}

type LocalPlanId = 'month' | 'half_year' | 'year';
type LocalPaymentMethod = 'card';

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

const PLANS: { id: LocalPlanId; title: string; price: string; badge: string | null }[] = [
  { id: 'month', title: '1 мес', price: '299 ₽', badge: null },
  { id: 'half_year', title: '6 мес', price: '1 699 ₽', badge: '-5%' },
  { id: 'year', title: '12 мес', price: '3 169 ₽', badge: '🔥 Выгодно' },
];

export const PaywallModal = ({ visible, onClose, reason, onPurchaseSuccess }: Props) => {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<LocalPlanId>('year');
  const [purchasing, setPurchasing] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'confirmed' | 'timeout'>('idle');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;

  const gradientColors: readonly [string, string, ...string[]] = isDark
    ? ['#0EA5E9', '#6366F1', '#8B5CF6']
    : ['#0284C7', '#4F46E5', '#7C3AED'];

  const resolvePaymentState = useCallback((url: string) => {
    const normalizedUrl = url.toLowerCase();
    const isSuccess = normalizedUrl.includes('/payment/success') || normalizedUrl.includes('checkorder') || normalizedUrl.includes('success=true');
    const isCancel = normalizedUrl.includes('cancel=true') || normalizedUrl.includes('reject') || normalizedUrl.includes('failed');
    return { isSuccess, isCancel };
  }, []);

  const startPolling = useCallback(async () => {
    setPaymentStatus('processing');
    const maxAttempts = 20;
    const pollInterval = 2000;
    let attemptsRef = { current: 0 };

    const checkStatus = async () => {
      attemptsRef.current += 1;
      try {
        const status = await getSubscriptionStatus();
        if (status.is_premium) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          invalidateProfile(queryClient);
          setPaymentStatus('confirmed');
          showToast('Подписка активирована', 'success');
          onPurchaseSuccess?.();
        } else if (attemptsRef.current >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPaymentStatus('timeout');
          showToast('Оплата обрабатывается. Проверьте статус через несколько минут.', 'info');
        }
      } catch (e) {
        if (attemptsRef.current >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPaymentStatus('timeout');
        }
      }
    };

    pollingRef.current = setInterval(checkStatus, pollInterval);
  }, [queryClient, showToast, onPurchaseSuccess]);

  const handleWebViewClose = useCallback((wasSuccess?: boolean, shouldPoll?: boolean) => {
    setWebViewUrl(null);
    if (shouldPoll !== false && wasSuccess) {
      startPolling();
    }
  }, [startPolling]);

  const handleNavigationStateChange = useCallback((navState: { url?: string }) => {
    const url = navState.url || '';
    if (!url) return;
    const { isSuccess, isCancel } = resolvePaymentState(url);
    if (isSuccess) {
      handleWebViewClose(true);
    } else if (isCancel) {
      handleWebViewClose(false);
      showToast('Оплата отменена. Попробуйте ещё раз.', 'info');
    }
  }, [handleWebViewClose, resolvePaymentState, showToast]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { confirmation_url } = await createSubscriptionPayment(selectedPlan, 'card');
      if (confirmation_url) {
        setWebViewUrl(confirmation_url);
      } else {
        showToast('Не удалось получить ссылку на оплату. Попробуйте позже.', 'error');
      }
    } catch (err) {
      console.error('[Paywall] Purchase error:', err);
      showToast('Ошибка при создании платежа. Проверьте интернет и попробуйте ещё раз.', 'error');
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

      {webViewUrl && (
        <View style={styleswebView.container}>
          <View style={styleswebView.header}>
            <Text style={styleswebView.title}>Оплата</Text>
            <TouchableOpacity
              onPress={() => {
                showToast('Проверяем статус оплаты...', 'info');
                handleWebViewClose(false, true);
              }}
              style={styleswebView.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X color={colors.text} size={22} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: webViewUrl }}
            style={styleswebView.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartWithLoadRequest={(request: { url?: string }) => {
              const url = request.url || '';
              if (url) {
                handleNavigationStateChange({ url });
              }
              return true;
            }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styleswebView.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styleswebView.loadingText}>Загрузка...</Text>
              </View>
            )}
            injectedJavaScript={`
              (function() {
                var originalPushState = window.history.pushState;
                window.history.pushState = function() {
                  originalPushState.apply(this, arguments);
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'url_change', url: window.location.href }));
                };
                window.addEventListener('hashchange', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'url_change', url: window.location.href }));
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
              } catch {}
            }}
          />
        </View>
      )}

      {(paymentStatus === 'processing' || paymentStatus === 'confirmed' || paymentStatus === 'timeout') && (
        <View style={stylesWaiting.overlay}>
          <View style={stylesWaiting.content}>
            {paymentStatus === 'processing' && (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[stylesWaiting.title, { color: colors.text }]}>Ожидание подтверждения</Text>
                <Text style={[stylesWaiting.desc, { color: colors.muted }]}>
                  Платёж обрабатывается. Это может занять до 40 секунд.
                </Text>
              </>
            )}
            {paymentStatus === 'confirmed' && (
              <>
                <View style={[stylesWaiting.successIcon, { backgroundColor: colors.primary }]}>
                  <Check color="#fff" size={32} strokeWidth={3} />
                </View>
                <Text style={[stylesWaiting.title, { color: colors.text }]}>Оплата успешна!</Text>
                <TouchableOpacity
                  style={[stylesWaiting.button, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    onClose();
                    onPurchaseSuccess?.();
                  }}
                >
                  <Text style={stylesWaiting.buttonText}>Продолжить</Text>
                </TouchableOpacity>
              </>
            )}
            {paymentStatus === 'timeout' && (
              <>
                <View style={[stylesWaiting.successIcon, { backgroundColor: colors.muted }]}>
                  <Crown color="#fff" size={32} />
                </View>
                <Text style={[stylesWaiting.title, { color: colors.text }]}>Оплата в обработке</Text>
                <Text style={[stylesWaiting.desc, { color: colors.muted }]}>
                  Информация о платеже поступит в течение нескольких минут.
                </Text>
                <TouchableOpacity
                  style={[stylesWaiting.button, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    onClose();
                  }}
                >
                  <Text style={stylesWaiting.buttonText}>Понятно</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
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

const styleswebView = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  header: {
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
  title: {
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: '#fff',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body,
    color: '#94A3B8',
  },
});

const stylesWaiting = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
    backgroundColor: 'rgba(2,6,23,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  desc: {
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
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.body,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
