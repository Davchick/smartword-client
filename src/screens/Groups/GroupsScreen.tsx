import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, BookOpen, MoreHorizontal, Trash2, Pencil, Archive } from 'lucide-react-native';
import { useGroups } from '../../hooks/useGroups';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useApiError } from '../../hooks/useApiError';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { AddGroupModal } from '../../components/AddGroupModal';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { StatsWidget } from '../../components/StatsWidget';
import { useStats } from '../../hooks/useStats';
import { SkeletonScreen } from '../../components/ui/SkeletonScreen';
import { queryClient } from '../../lib/queryClient';
import { queryKey } from '../../lib/queryKeys';
import { pluralizeRu } from '../../lib/pluralizeRu';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { FREE_GROUPS_LIMIT } from '../../constants';
import type { GroupsScreenProps } from '../../navigation/types';
import type { WordGroup } from '../../hooks/useGroups';

export const GroupsScreen = ({ navigation }: GroupsScreenProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { groups, loading, createGroup, deleteGroup, renameGroup } = useGroups();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { stats } = useStats();
  const { handleApiError } = useApiError();

  const [addModalVisible, setAddModalVisible] = useState(false);

  const { refreshing, handleRefresh } = usePullToRefresh({
    onRefresh: () => queryClient.refetchQueries({ queryKey: queryKey.groups.list() }),
  });

  // Количество неархивных слов берём прямо из learned_count группы
  // learned_count = слова с correct_count >= 5 (архивные)
  // activeCount = word_count - learned_count

  // Bottom-sheet action menu
  const [actionMenuGroup, setActionMenuGroup] = useState<WordGroup | null>(null);

  // Rename modal
  const [renameGroup_, setRenameGroup] = useState<WordGroup | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  const openActionMenu = (group: WordGroup) => {
    setActionMenuGroup(group);
  };

  const closeActionMenu = (cb?: () => void) => {
    setActionMenuGroup(null);
    cb?.();
  };

  const handleAddPress = () => {
    if (!profile?.is_premium && groups.length >= FREE_GROUPS_LIMIT) {
    }
    setAddModalVisible(true);
  };

  const handleDeletePress = () => {
    const group = actionMenuGroup;
    closeActionMenu(() => {
      if (!group) return;
      const total = group.word_count;
      const totalLabel = `${total} ${pluralizeRu(total, ['слово', 'слова', 'слов'])}`;
      setTimeout(() => {
        Alert.alert(
          'Удалить словарь?',
          `Словарь "${group.name}" и все ${totalLabel} будут удалены навсегда — восстановить их не получится.`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: async () => {
                const result = await deleteGroup(group.id);
                if (result.error) {
                  handleApiError(new Error(result.error), 'Не удалось удалить словарь');
                }
              },
            },
          ]
        );
      }, 300);
    });
  };

  const handleRenamePress = () => {
    const group = actionMenuGroup;
    closeActionMenu(() => {
      if (!group) return;
      setRenameName(group.name);
      setRenameGroup(group);
    });
  };

  const handleRenameSave = async () => {
    if (!renameGroup_) return;
    const trimName = renameName.trim();
    if (!trimName) return;
    setRenameSaving(true);
    await renameGroup(renameGroup_.id, trimName, renameGroup_.language ?? '');
    setRenameSaving(false);
    setRenameGroup(null);
  };

  if (loading) {
    return <SkeletonScreen type="list" count={3} showStats />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Словари</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Archive')}
            style={styles.addButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Открыть архив выученных слов"
          >
            <Archive color={colors.muted} size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddPress}
            style={styles.addButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Создать новый словарь"
          >
            <Plus color={colors.primary} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          groups.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          user ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        windowSize={5}
        maxToRenderPerBatch={5}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            <StatsWidget stats={stats} />
          </View>
        }
        ListHeaderComponentStyle={{ marginBottom: 0 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpen color={colors.muted} size={56} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет словарей</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Создайте первый словарь, чтобы начать учить слова
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                  elevation: 8,
                },
              ]}
              onPress={handleAddPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>Создать словарь</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const activeCount = Math.max(0, item.word_count - (item.learned_count ?? 0));
          const countLabel = `${activeCount} ${pluralizeRu(activeCount, ['слово', 'слова', 'слов'])}`;

          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() =>
                navigation.navigate('GroupDetail', {
                  groupId: item.id,
                  groupName: item.name,
                  language: item.language,
                })
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Словарь ${item.name}, ${countLabel}`}
              accessibilityHint="Открыть словарь"
            >
              <View style={styles.cardContent}>
                <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                {item.language ? (
                  <Text style={[styles.groupLanguage, { color: colors.primary }]}>{item.language}</Text>
                ) : null}
                <Text style={[styles.wordCount, { color: colors.muted }]}>{countLabel}</Text>
              </View>
              <TouchableOpacity
                onPress={() => openActionMenu(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.moreButton}
                accessibilityRole="button"
                accessibilityLabel={`Меню действий для словаря ${item.name}`}
              >
                <MoreHorizontal color={colors.muted} size={20} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Bottom-sheet action menu ── */}
      <BottomSheet
        visible={actionMenuGroup !== null}
        onClose={() => closeActionMenu()}
      >
        {actionMenuGroup && (
          <View style={styles.sheetPreview}>
            <Text style={[styles.sheetPreviewName, { color: colors.text }]} numberOfLines={1}>
              {actionMenuGroup.name}
            </Text>
            <Text style={[styles.sheetPreviewMeta, { color: colors.muted }]}>
              {Math.max(0, actionMenuGroup.word_count - (actionMenuGroup.learned_count ?? 0))}{' '}
              {pluralizeRu(Math.max(0, actionMenuGroup.word_count - (actionMenuGroup.learned_count ?? 0)), ['слово', 'слова', 'слов'])}
              {actionMenuGroup.language ? ` · ${actionMenuGroup.language}` : ''}
            </Text>
          </View>
        )}

        <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

        {/* Rename */}
        <TouchableOpacity
          style={styles.sheetAction}
          onPress={handleRenamePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Переименовать словарь"
        >
          <View style={[styles.sheetActionIcon, { backgroundColor: colors.primaryDim }]}>
            <Pencil color={colors.primary} size={18} />
          </View>
          <View style={styles.sheetActionText}>
            <Text style={[styles.sheetActionLabel, { color: colors.text }]}>Переименовать</Text>
            <Text style={[styles.sheetActionSub, { color: colors.muted }]}>Изменить название или язык</Text>
          </View>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={styles.sheetAction}
          onPress={handleDeletePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Удалить словарь"
        >
          <View style={[styles.sheetActionIcon, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
            <Trash2 color={colors.danger} size={18} />
          </View>
          <View style={styles.sheetActionText}>
            <Text style={[styles.sheetActionLabel, { color: colors.danger }]}>Удалить словарь</Text>
            <Text style={[styles.sheetActionSub, { color: colors.muted }]}>Невозможно будет восстановить</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sheetCancel, { backgroundColor: colors.card }]}
          onPress={() => closeActionMenu()}
          activeOpacity={0.7}
        >
          <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Отмена</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── Rename modal ── */}
      <Modal
        transparent
        visible={renameGroup_ !== null}
        animationType="fade"
        onRequestClose={() => setRenameGroup(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.editOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRenameGroup(null)} />
          <View style={[styles.editSheet, { backgroundColor: colors.elevated, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.editTitle, { color: colors.text }]}>Переименовать словарь</Text>

            <Text style={[styles.editLabel, { color: colors.muted }]}>Новое название</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={renameName}
              onChangeText={setRenameName}
              placeholder="Например, Английский A2"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              autoFocus
              onSubmitEditing={handleRenameSave}
            />

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editCancelBtn, { backgroundColor: colors.card }]}
                onPress={() => setRenameGroup(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editSaveBtn,
                  { backgroundColor: colors.primary },
                  !renameName.trim() && styles.editSaveBtnDisabled,
                ]}
                onPress={handleRenameSave}
                activeOpacity={0.8}
                disabled={!renameName.trim() || renameSaving}
              >
                {renameSaving ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text style={[styles.editSaveText, { color: colors.background }]}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AddGroupModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={async (name, lang) => {
          await createGroup(name, lang);
          // Модал закроется внутри AddGroupModal при успехе
        }}
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontFamily: fonts.headingBlack,
  },
  subtitle: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  limitPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  limitPillText: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
  },
  addButton: {
    padding: spacing.xs,
  },
  list: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  listEmpty: {
    paddingTop: spacing.xl,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  groupName: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
  },
  groupLanguage: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
  },
  wordCount: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  moreButton: {
    padding: spacing.xs,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  emptyButtonText: {
    fontWeight: '700',
    fontSize: typography.body,
  },

  // ── Bottom sheet ──
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetPreview: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    gap: 3,
  },
  sheetPreviewName: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  sheetPreviewMeta: {
    fontSize: typography.small,
  },
  sheetDivider: {
    height: 1,
    marginBottom: spacing.sm,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  sheetActionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionText: {
    gap: 2,
  },
  sheetActionLabel: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  sheetActionSub: {
    fontSize: typography.small,
  },
  sheetCancel: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sheetCancelText: {
    fontSize: typography.body,
    fontWeight: '600',
  },

  // ── Rename modal ──
  editOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  editSheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  editTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  editLabel: {
    fontSize: typography.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  editSaveBtn: {
    flex: 2,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editSaveBtnDisabled: {
    opacity: 0.4,
  },
  editSaveText: {
    fontSize: typography.body,
    fontWeight: '700',
  },
});
