import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Crown, Zap, MessageCircle, BookOpen, Check } from 'lucide-react-native';
import { useTheme, spacing, radii, typography } from '../theme';
import { initIAP, purchaseProduct, restorePurchases, PRODUCT_IDS } from '../lib/iap';
import type { ProductId } from '../lib/iap';

interface Props {
  visible: boolean;
  onClose: () => void;
  reason: 'groups' | 'words' | 'chat';
  onPurchaseSuccess?: () => void;
}

const REASON_TITLES: Record<Props['reason'], string> = {
  groups: 'Лимит бесплатных словарей',
  words: 'Лимит бесплатных слов',
  chat: 'Лимит бесплатных сообщений в AI-чате',
};

const FEATURES = [
  { icon: BookOpen, text: 'Неограниченные группы слов' },
  { icon: Zap, text: 'Неограниченные слова' },
  { icon: MessageCircle, text: 'Безлимитный AI-чат' },
  { icon: Crown, text: 'Приоритет в новых функциях' },
];

const PRODUCTS = [
  { id: PRODUCT_IDS.MONTHLY, label: 'В месяц', price: '299 ₽', badge: null },
  { id: PRODUCT_IDS.YEARLY, label: 'В год', price: '1 990 ₽', badge: 'Лучшая цена' },
  { id: PRODUCT_IDS.LIFETIME, label: 'Навсегда', price: '3 990 ₽', badge: null },
];

export const PaywallModal = ({ visible, onClose, reason, onPurchaseSuccess }: Props) => {
  const { colors } = useTheme();
  const [selectedProduct, setSelectedProduct] = useState<ProductId>(PRODUCT_IDS.YEARLY);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (visible) {
      initIAP().catch(() => {/* нативный модуль недоступен в Expo Go */});
    }
  }, [visible]);

  const handlePurchase = async () => {
    setPurchasing(true);
    const { error } = await purchaseProduct(selectedProduct);
    setPurchasing(false);
    if (!error) {
      onPurchaseSuccess?.();
      onClose();
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    await restorePurchases();
    setRestoring(false);
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
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={colors.muted} size={22} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.heroRow}>
              <View style={[styles.heroCircleOuter, { borderColor: `${colors.primary}55` }]}>
                <View style={[styles.heroCircleInner, { backgroundColor: colors.primary }]}>
                  <Crown color="#0f172a" size={30} />
                </View>
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={[styles.title, { color: colors.text }]}>SmartWord Premium</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>{REASON_TITLES[reason]}</Text>
              </View>
            </View>

            <Text style={[styles.subtitleSecondary, { color: colors.textSecondary }]}>
              Красивые словари, умные тренировки и живой диалог с ИИ — без ограничений и лимитов.
            </Text>

            <View
              style={[
                styles.featuresBlock,
                {
                  backgroundColor: 'rgba(15,23,42,0.85)',
                  borderColor: 'rgba(148,163,184,0.45)',
                },
              ]}
            >
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(15,23,42,0.9)' }]}>
                    <Check color={colors.success} size={16} />
                  </View>
                  <Icon color={colors.primary} size={18} />
                  <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.productsBlock}>
              {PRODUCTS.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productCard,
                    {
                      backgroundColor:
                        selectedProduct === product.id ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.75)',
                      borderColor:
                        selectedProduct === product.id ? colors.primary : 'rgba(148,163,184,0.5)',
                    },
                  ]}
                  onPress={() => setSelectedProduct(product.id as ProductId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.productInfo}>
                    <Text style={[
                      styles.productLabel,
                      { color: selectedProduct === product.id ? colors.text : colors.textSecondary },
                    ]}>
                      {product.label}
                    </Text>
                    {product.badge && (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.badgeText, { color: colors.background }]}>{product.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.productPrice,
                    { color: selectedProduct === product.id ? colors.primary : colors.textSecondary },
                  ]}>
                    {product.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                purchasing && styles.purchaseButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={purchasing}
              activeOpacity={0.85}
            >
              {purchasing ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.purchaseButtonText, { color: '#0f172a' }]}>Оформить Premium</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
            >
              <Text style={[styles.restoreText, { color: colors.muted }]}>
                {restoring ? 'Восстановление...' : 'Восстановить покупки'}
              </Text>
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
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
    borderWidth: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
    padding: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroCircleOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  heroCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: typography.small,
  },
  subtitleSecondary: {
    fontSize: typography.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  featuresBlock: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  featureText: {
    fontSize: typography.body,
    flex: 1,
  },
  productsBlock: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  productLabel: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  badge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  productPrice: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  purchaseButton: {
    borderRadius: radii.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  restoreText: {
    fontSize: typography.small,
  },
});

