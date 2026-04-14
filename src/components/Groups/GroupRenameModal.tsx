import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, typography, fonts, radii } from '../../theme';
import type { WordGroup } from '../../hooks/useGroups';

interface Props {
  visible: boolean;
  group: WordGroup | null;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}

export const GroupRenameModal = ({ visible, group, onSave, onClose }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && group) {
      setName(group.name);
    }
  }, [visible, group]);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || !group || saving) return;

    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  }, [name, group, saving, onSave]);

  if (!group) return null;

  const isValid = name.trim().length > 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.elevated,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>
            Переименовать словарь
          </Text>

          <Text style={[styles.label, { color: colors.muted }]}>
            Новое название
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Например, Английский A2"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            autoFocus
            onSubmitEditing={handleSave}
            blurOnSubmit={false}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Отменить переименование"
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Отмена
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={!isValid || saving}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !isValid || saving ? 0.4 : (pressed ? 0.85 : 1),
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Сохранить новое название"
            >
              {saving ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={[styles.saveText, { color: colors.background }]}>
                  Сохранить
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    fontFamily: fonts.headingBold,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  saveBtn: {
    flex: 2,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveText: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
  },
});
