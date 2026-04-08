import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, radii, typography } from '../../theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  showHandle?: boolean;
  title?: string;
  subtitle?: string;
  snapPoints?: number[]; // Процент от высоты экрана (0-100)
  testID?: string;
}

/**
 * Универсальный BottomSheet компонент
 * Заменяет дублирующийся код модалок в GroupsScreen, GroupDetailScreen, ArchiveScreen, ProfileScreen
 * 
 * @example Простое использование
 * <BottomSheet visible={showSort} onClose={() => setShowSort(false)}>
 *   <Text>Контент</Text>
 * </BottomSheet>
 * 
 * @example С заголовком
 * <BottomSheet 
 *   visible={showActions} 
 *   onClose={() => setShowActions(false)}
 *   title="Сортировка"
 *   subtitle="Как упорядочить элементы"
 * >
 *   <Text>Контент</Text>
 * </BottomSheet>
 */
export const BottomSheet = ({
  visible,
  onClose,
  children,
  showHandle = true,
  title,
  subtitle,
  testID,
}: BottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Показываем sheet
      Animated.parallel([
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Скрываем sheet
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, anim, backdropOpacity]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  // Оптимизация: не рендерим, если sheet полностью скрыт
  // (но только после первой анимации)
  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.elevated,
              paddingBottom: insets.bottom + spacing.sm,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          {showHandle && (
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          )}

          {/* Title & Subtitle */}
          {title && (
            <Text 
              style={[styles.title, { color: colors.text }]}
              accessibilityRole="header"
              accessibilityLabel={title}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {subtitle}
            </Text>
          )}

          {/* Children content */}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.small,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
