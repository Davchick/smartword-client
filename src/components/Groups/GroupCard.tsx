import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { useTheme, spacing, typography, fonts } from '../../theme';
import type { WordGroup } from '../../hooks/useGroups';
import { getActiveCount, formatWordCount, formatGroupLabel } from '../../utils/groupUtils';

interface Props {
  group: WordGroup;
  onPress: () => void;
  onActionPress: () => void;
}

/**
 * Карточка словаря.
 *
 * Критически важно: внешний Pressable НЕ имеет accessibilityRole="button".
 * На вебе это даёт <div> вместо <button>, что предотвращает вложенные
 * <button> при наличии внутренней кнопки действий (⋮).
 *
 * accessibilityRole="button" установлен ТОЛЬКО на вложенной кнопке меню.
 */
export const GroupCard = memo(({ group, onPress, onActionPress }: Props) => {
  const { colors } = useTheme();
  const activeCount = getActiveCount(group);
  const countLabel = formatWordCount(activeCount);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          pointerEvents: 'box-none',
        },
      ]}
      accessibilityLabel={formatGroupLabel(group)}
      accessibilityHint="Открыть словарь"
    >
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        {group.language ? (
          <Text style={[styles.language, { color: colors.primary }]} numberOfLines={1}>
            {group.language}
          </Text>
        ) : null}
        <Text style={[styles.count, { color: colors.muted }]}>{countLabel}</Text>
      </View>

      <Pressable
        onPress={onActionPress}
        style={({ pressed }) => [
          styles.actionButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={`Меню действий для словаря ${group.name}`}
      >
        <MoreHorizontal color={colors.muted} size={20} />
      </Pressable>
    </Pressable>
  );
});

GroupCard.displayName = 'GroupCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
    gap: 3,
    paddingRight: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  language: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  count: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  actionButton: {
    padding: 4,
  },
});
