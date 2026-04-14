import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { useTheme, spacing, typography, fonts } from '../../theme';
import { getActiveCount, formatWordCount } from '../../utils/groupUtils';
import type { WordGroup } from '../../hooks/useGroups';

interface Props {
  visible: boolean;
  group: WordGroup | null;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const GroupActionSheet = memo(
  ({ visible, group, onRename, onDelete, onClose }: Props) => {
    const { colors } = useTheme();

    if (!group) return null;

    const activeCount = getActiveCount(group);
    const countLabel = formatWordCount(activeCount);

    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.preview}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {countLabel}
            {group.language ? ` · ${group.language}` : ''}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Rename */}
        <Pressable
          onPress={onRename}
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Переименовать словарь"
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primaryDim }]}>
            <Pencil color={colors.primary} size={18} />
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              Переименовать
            </Text>
            <Text style={[styles.actionSub, { color: colors.muted }]}>
              Изменить название или язык
            </Text>
          </View>
        </Pressable>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Удалить словарь"
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
            <Trash2 color={colors.danger} size={18} />
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionLabel, { color: colors.danger }]}>
              Удалить словарь
            </Text>
            <Text style={[styles.actionSub, { color: colors.muted }]}>
              Невозможно будет восстановить
            </Text>
          </View>
        </Pressable>

        {/* Cancel */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancel,
            {
              backgroundColor: colors.card,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Закрыть меню"
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            Отмена
          </Text>
        </Pressable>
      </BottomSheet>
    );
  },
);

GroupActionSheet.displayName = 'GroupActionSheet';

const styles = StyleSheet.create({
  preview: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    gap: 3,
  },
  name: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBold,
  },
  meta: {
    fontSize: typography.small,
  },
  divider: {
    height: 1,
    marginBottom: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    gap: 2,
  },
  actionLabel: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  actionSub: {
    fontSize: typography.small,
  },
  cancel: {
    marginTop: spacing.sm,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: 4,
  },
  cancelText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
});
