import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Dumbbell, BookOpen, MoreHorizontal, Trash2, Pencil } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { useProfile } from '../../hooks/useProfile';
import { AddWordModal } from '../../components/AddWordModal';
import { PaywallModal } from '../../components/PaywallModal';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import type { GroupDetailScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

const FREE_WORDS_LIMIT = 30;

export const GroupDetailScreen = ({ route, navigation }: GroupDetailScreenProps) => {
  const { groupId, groupName } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { words, loading, totalCount, addWord, deleteWord, updateWord } = useWords(groupId);
  const { profile } = useProfile();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Bottom-sheet action menu state
  const [actionMenuWord, setActionMenuWord] = useState<Word | null>(null);
  const actionMenuAnim = useRef(new Animated.Value(0)).current;

  // Edit word modal state
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [editOriginal, setEditOriginal] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const openActionMenu = (word: Word) => {
    setActionMenuWord(word);
    Animated.spring(actionMenuAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeActionMenu = (cb?: () => void) => {
    Animated.timing(actionMenuAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActionMenuWord(null);
      cb?.();
    });
  };

  const handleAddPress = () => {
    if (!profile?.is_premium && totalCount >= FREE_WORDS_LIMIT) {
      setPaywallVisible(true);
      return;
    }
    setAddModalVisible(true);
  };

  const handleStartTraining = () => {
    if (words.length === 0) {
      Alert.alert('Нет слов', 'Добавьте хотя бы одно слово для тренировки.');
      return;
    }
    navigation.navigate('TrainingModes', { groupId, groupName });
  };

  const handleDeletePress = () => {
    const word = actionMenuWord;
    closeActionMenu(() => {
      if (!word) return;
      setTimeout(() => {
        Alert.alert(
          'Удалить слово?',
          `"${word.original}" будет удалено навсегда — восстановить его не получится.`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: () => deleteWord(word.id),
            },
          ]
        );
      }, 300);
    });
  };

  const handleEditPress = () => {
    const word = actionMenuWord;
    closeActionMenu(() => {
      if (!word) return;
      setEditOriginal(word.original);
      setEditTranslation(word.translation);
      setEditWord(word);
    });
  };

  const handleEditSave = async () => {
    if (!editWord) return;
    const trimOriginal = editOriginal.trim();
    const trimTranslation = editTranslation.trim();
    if (!trimOriginal || !trimTranslation) return;
    setEditSaving(true);
    await updateWord(editWord.id, trimOriginal, trimTranslation);
    setEditSaving(false);
    setEditWord(null);
  };

  const sheetTranslateY = actionMenuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const backdropOpacity = actionMenuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{groupName}</Text>
          <Text style={[styles.wordCount, { color: colors.muted }]}>{words.length} слов</Text>
        </View>

        <TouchableOpacity
          onPress={handleStartTraining}
          style={[styles.trainButton, { backgroundColor: colors.primaryDim }]}
          activeOpacity={0.8}
        >
          <Dumbbell color={colors.primary} size={20} />
          <Text style={[styles.trainButtonText, { color: colors.primary }]}>Тренировка</Text>
        </TouchableOpacity>
      </View>

      {/* Word list */}
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          words.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpen color={colors.muted} size={56} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет слов</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Добавьте первое слово в этот словарь</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={handleAddPress} activeOpacity={0.8}>
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>Добавить слово</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.wordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.wordContent}>
              <Text style={[styles.wordOriginal, { color: colors.text }]}>{item.original}</Text>
              <Text style={[styles.wordTranslation, { color: colors.textSecondary }]}>{item.translation}</Text>
            </View>
            <View style={styles.wordRight}>
              {item.correct_count > 0 && (
                <View style={styles.correctBadge}>
                  <Text style={[styles.correctCount, { color: colors.success }]}>
                    ✓ {Number.isInteger(item.correct_count) ? item.correct_count : item.correct_count.toFixed(1)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => openActionMenu(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.moreButton}
              >
                <MoreHorizontal color={colors.muted} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg, backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleAddPress}
        activeOpacity={0.85}
      >
        <Plus color={colors.background} size={26} />
      </TouchableOpacity>

      {/* ── Bottom-sheet action menu ── */}
      <Modal
        transparent
        visible={actionMenuWord !== null}
        animationType="none"
        onRequestClose={() => closeActionMenu()}
        statusBarTranslucent
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeActionMenu()} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.elevated, paddingBottom: insets.bottom + spacing.sm },
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          {/* Sheet handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Word preview */}
          {actionMenuWord && (
            <View style={styles.sheetPreview}>
              <Text style={[styles.sheetPreviewOriginal, { color: colors.text }]} numberOfLines={1}>
                {actionMenuWord.original}
              </Text>
              <Text style={[styles.sheetPreviewTranslation, { color: colors.textSecondary }]} numberOfLines={1}>
                {actionMenuWord.translation}
              </Text>
            </View>
          )}

          <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

          {/* Edit action */}
          <TouchableOpacity
            style={styles.sheetAction}
            onPress={handleEditPress}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetActionIcon, { backgroundColor: colors.primaryDim }]}>
              <Pencil color={colors.primary} size={18} />
            </View>
            <View style={styles.sheetActionText}>
              <Text style={[styles.sheetActionLabel, { color: colors.text }]}>Редактировать</Text>
              <Text style={[styles.sheetActionSub, { color: colors.muted }]}>Изменить слово или перевод</Text>
            </View>
          </TouchableOpacity>

          {/* Delete action */}
          <TouchableOpacity
            style={styles.sheetAction}
            onPress={handleDeletePress}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetActionIcon, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
              <Trash2 color={colors.danger} size={18} />
            </View>
            <View style={styles.sheetActionText}>
              <Text style={[styles.sheetActionLabel, { color: colors.danger }]}>Удалить</Text>
              <Text style={[styles.sheetActionSub, { color: colors.muted }]}>Невозможно будет восстановить</Text>
            </View>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={[styles.sheetCancel, { backgroundColor: colors.card }]}
            onPress={() => closeActionMenu()}
            activeOpacity={0.7}
          >
            <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Отмена</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* ── Edit word modal ── */}
      <Modal
        transparent
        visible={editWord !== null}
        animationType="fade"
        onRequestClose={() => setEditWord(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.editOverlay}
          behavior="padding"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditWord(null)} />
          <View style={[styles.editSheet, { backgroundColor: colors.elevated, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.editTitle, { color: colors.text }]}>Редактировать слово</Text>

            <Text style={[styles.editLabel, { color: colors.muted }]}>Слово</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={editOriginal}
              onChangeText={setEditOriginal}
              placeholder="Введите слово"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={[styles.editLabel, { color: colors.muted }]}>Перевод</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={editTranslation}
              onChangeText={setEditTranslation}
              placeholder="Введите перевод"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              onSubmitEditing={handleEditSave}
            />

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editCancelBtn, { backgroundColor: colors.card }]}
                onPress={() => setEditWord(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editSaveBtn,
                  { backgroundColor: colors.primary },
                  (!editOriginal.trim() || !editTranslation.trim()) && styles.editSaveBtnDisabled,
                ]}
                onPress={handleEditSave}
                activeOpacity={0.8}
                disabled={!editOriginal.trim() || !editTranslation.trim() || editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text style={[styles.editSaveText, { color: colors.background }]}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AddWordModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={(original, translation) => addWord(original, translation, groupId)}
        totalCount={totalCount}
        isPremium={profile?.is_premium ?? false}
      />
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason="words"
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  wordCount: {
    fontSize: typography.small,
  },
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trainButtonText: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  wordCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  wordContent: {
    flex: 1,
    gap: 4,
  },
  wordOriginal: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  wordTranslation: {
    fontSize: typography.small,
  },
  wordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  correctBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  correctCount: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  moreButton: {
    padding: spacing.xs,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // ── Bottom sheet ──
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
  sheetPreviewOriginal: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  sheetPreviewTranslation: {
    fontSize: typography.body,
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

  // ── Edit modal ──
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
