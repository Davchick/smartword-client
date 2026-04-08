import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
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
  snapPoints?: number[];
  testID?: string;
}

/**
 * Универсальный BottomSheet компонент
 * Использует нативную анимацию Modal для стабильности
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.55)' }]} onPress={onClose}>
        <View 
          style={[
            styles.sheet,
            { 
              backgroundColor: colors.elevated,
              paddingBottom: insets.bottom + spacing.sm,
            }
          ]}
          onStartShouldSetResponder={() => true}
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
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
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
