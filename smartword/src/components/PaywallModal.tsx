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
  groups: 'Вы достигли лимита бесплатных словарей',
  words: 'Вы достигли лимита бесплатных слов',
  chat: 'Бесплатные сообщения в AI-чате закончились',
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.elevated }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={colors.muted} size={22} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.iconRow}>
              <Crown color={colors.primary} size={44} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>SmartWord Premium</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{REASON_TITLES[reason]}</Text>
            <Text style={[styles.subtitleSecondary, { color: colors.textSecondary }]}>
              Учите нужные слова без ограничений: больше словарей, больше тренировок и живой диалог с AI.
            </Text>

            <View style={[styles.featuresBlock, { backgroundColor: colors.card }]}>
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <View key={i} style={styles.featureRow}>
                  <Check color={colors.success} size={18} />
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
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedProduct === product.id && { borderColor: colors.primary, backgroundColor: colors.primaryDim },
                  ]}
                  onPress={() => setSelectedProduct(product.id as ProductId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.productInfo}>
                    <Text style={[
                      styles.productLabel,
                      { color: colors.textSecondary },
                      selectedProduct === product.id && { color: colors.text },
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
                    { color: colors.textSecondary },
                    selectedProduct === product.id && { color: colors.primary },
                  ]}>
                    {product.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.purchaseButton, { backgroundColor: colors.primary }, purchasing && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing}
              activeOpacity={0.85}
            >
              {purchasing ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.purchaseButtonText, { color: colors.background }]}>Оформить</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
    padding: spacing.xs,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.small,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitleSecondary: {
    fontSize: typography.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  featuresBlock: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: typography.body,
  },
  productsBlock: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
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
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
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
