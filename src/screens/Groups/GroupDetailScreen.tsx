import React, { useState, useMemo, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Dumbbell, BookOpen, MoreHorizontal, Trash2, Pencil } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useApiError } from '../../hooks/useApiError';
import { AddWordModal } from '../../components/AddWordModal';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SkeletonScreen } from '../../components/ui/SkeletonScreen';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { ARCHIVE_THRESHOLD } from '../../constants';
import { pluralizeRu } from '../../lib/pluralizeRu';
import type { GroupDetailScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

const getBadgeColors = (count: number) => {
  // 0.5 и другие дробные значения до 2 считаем низким прогрессом (оранжевый),
  // 2–3.99 — средний (жёлтый), 4+ — высокий (зелёный)
  if (count > 0 && count < 2) {
    return { bg: 'rgba(251, 146, 60, 0.2)', text: '#FB923C' };
  }
  if (count >= 2 && count < 4) {
    return { bg: 'rgba(250, 204, 21, 0.2)', text: '#FACC15' };
  }
  return { bg: 'rgba(52, 211, 153, 0.12)', text: '#34D399' };
};

export const GroupDetailScreen = ({ route, navigation }: GroupDetailScreenProps) => {
  const { groupId, groupName } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { words, loading, totalCount, addWord, deleteWord, updateWord, getTrainingWords, refetch } = useWords(groupId);
  const visibleWords = words.filter((w) => w.correct_count < ARCHIVE_THRESHOLD);
  const activeCount = visibleWords.length;
  const activeCountLabel = `${activeCount} ${pluralizeRu(activeCount, ['слово', 'слова', 'слов'])}`;
  const { profile } = useProfile();
  const { user } = useAuth();
  const { handleApiError } = useApiError();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setLastUpdated(new Date());
    setRefreshing(false);
  }, [refetch]);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'added-new' | 'added-old' | 'name-az' | 'name-za' | 'score'>('added-new');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  const filteredAndSortedWords = useMemo(() => {
    let list = visibleWords;

    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (w) =>
          w.original.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...list];
    if (sortBy === 'added-new') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'added-old') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'name-az') {
      sorted.sort((a, b) => a.original.localeCompare(b.original));
    } else if (sortBy === 'name-za') {
      sorted.sort((a, b) => b.original.localeCompare(a.original));
    } else if (sortBy === 'score') {
      sorted.sort((a, b) => b.correct_count - a.correct_count);
    }
    return sorted;
  }, [visibleWords, searchQuery, sortBy]);

  const openSortSheet = () => setSortSheetVisible(true);
  const closeSortSheet = () => setSortSheetVisible(false);

  const handleSelectSort = (value: 'added-new' | 'added-old' | 'name-az' | 'name-za' | 'score') => {
    setSortBy(value);
    closeSortSheet();
  };

  // Bottom-sheet action menu state
  const [actionMenuWord, setActionMenuWord] = useState<Word | null>(null);

  // Edit word modal state
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [editOriginal, setEditOriginal] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Обновляем слова при возврате на экран (после тренировки)
  // Примечание: useWords уже обновляет состояние локально при updateWordProgress,
  // поэтому refetch не нужен - данные уже актуальны
  useFocusEffect(
    useCallback(() => {
      // refetch(); // Закомментировано, чтобы избежать race condition
    }, [])
  );

  const openActionMenu = (word: Word) => {
    setActionMenuWord(word);
  };

  const closeActionMenu = (cb?: () => void) => {
    setActionMenuWord(null);
    cb?.();
  };

  const handleAddPress = () => {
    setAddModalVisible(true);
  };

  const handleStartTraining = () => {
    if (getTrainingWords().length === 0) {
      Alert.alert('Нет слов', 'Добавьте хотя бы одно слово для тренировки.');
      return;
    }
    // Переключаемся на таб "Тренировка" и передаём groupId для выбора режима
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate('TrainingTab', { groupId, groupName });
    }
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
              onPress: async () => {
                const result = await deleteWord(word.id);
                if (result.error) {
                  handleApiError(new Error(result.error), 'Не удалось удалить слово');
                }
              },
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
    try {
      const result = await updateWord(editWord.id, trimOriginal, trimTranslation);
      if (result.error) {
        handleApiError(new Error(result.error), 'Не удалось обновить слово');
      } else {
        setEditWord(null);
      }
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return <SkeletonScreen type="detail" count={5} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Назад к списку словарей"
        >
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{groupName}</Text>
          <Text style={[styles.wordCount, { color: colors.muted }]}>{activeCountLabel}</Text>
          {lastUpdated && (
            <Text 
              style={[styles.lastUpdated, { color: colors.muted }]}
              accessibilityRole="text"
              accessibilityLabel={`Последнее обновление: ${lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
              accessibilityLiveRegion="polite"
            >
              Обновлено: {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleStartTraining}
          style={[styles.trainButton, { backgroundColor: colors.primaryDim }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Начать тренировку"
          accessibilityHint={getTrainingWords().length === 0 ? 'Сначала добавьте слова' : undefined}
        >
          <Dumbbell color={colors.primary} size={20} />
          <Text style={[styles.trainButtonText, { color: colors.primary }]}>Тренировка</Text>
        </TouchableOpacity>
      </View>

      {/* Search + sort */}
      <View style={[styles.searchSection, { borderBottomColor: colors.border }]}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Поиск по словам..."
          onSortPress={openSortSheet}
        />
      </View>

      {/* Word list */}
      <FlatList
        data={filteredAndSortedWords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          filteredAndSortedWords.length === 0 && styles.listEmpty,
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
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpen color={colors.muted} size={56} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {visibleWords.length === 0 ? 'Нет слов' : 'Ничего не найдено'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {visibleWords.length === 0
                ? 'Добавьте первое слово в этот словарь'
                : 'Измените поиск или сортировку'}
            </Text>
            {visibleWords.length === 0 && (
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
                <Text style={[styles.emptyButtonText, { color: colors.background }]}>Добавить слово</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.wordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.wordContent}>
              <Text style={[styles.wordNative, { color: colors.textSecondary }]}>{item.translation}</Text>
              <Text style={[styles.wordForeign, { color: colors.text }]}>{item.original}</Text>
            </View>
            <View style={styles.wordRight}>
              {item.correct_count > 0 && (
                <View style={[styles.correctBadge, { backgroundColor: getBadgeColors(item.correct_count).bg }]}>
                  <Text style={[styles.correctCount, { color: getBadgeColors(item.correct_count).text }]}>
                    ✓ {Number.isInteger(item.correct_count) ? item.correct_count : item.correct_count.toFixed(1)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => openActionMenu(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.moreButton}
                accessibilityRole="button"
                accessibilityLabel={`Меню действий для слова ${item.original}`}
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
      <BottomSheet
        visible={actionMenuWord !== null}
        onClose={() => closeActionMenu()}
      >
        {/* Word preview: foreign (big), native (small) */}
        {actionMenuWord && (
          <View style={styles.sheetPreview}>
            <Text style={[styles.sheetPreviewNative, { color: colors.textSecondary }]} numberOfLines={1}>
              {actionMenuWord.translation}
            </Text>
            <Text style={[styles.sheetPreviewForeign, { color: colors.text }]} numberOfLines={1}>
              {actionMenuWord.original}
            </Text>
          </View>
        )}

        <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

        {/* Edit action */}
        <TouchableOpacity
          style={styles.sheetAction}
          onPress={handleEditPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Редактировать слово"
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
          accessibilityRole="button"
          accessibilityLabel="Удалить слово"
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
      </BottomSheet>

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

      {/* Sort bottom sheet */}
      <Modal
        transparent
        visible={sortSheetVisible}
        animationType="fade"
        onRequestClose={closeSortSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.sortBackdrop} onPress={closeSortSheet} />
        <View
          style={[
            styles.sortSheet,
            { backgroundColor: colors.elevated, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sortTitle, { color: colors.text }]}>Сортировка</Text>
          <Text style={[styles.sortSubtitle, { color: colors.muted }]}>
            Как упорядочить слова в словаре
          </Text>

          <TouchableOpacity
            style={styles.sortOption}
            onPress={() => handleSelectSort('added-new')}
            activeOpacity={0.7}
          >
            <View style={styles.sortOptionTextWrap}>
              <Text style={[styles.sortOptionLabel, { color: colors.text }]}>
                По добавлению — новые выше
              </Text>
            </View>
            <View style={[styles.sortRadioOuter, { borderColor: colors.border }]}>
              {sortBy === 'added-new' && (
                <View style={[styles.sortRadioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortOption}
            onPress={() => handleSelectSort('added-old')}
            activeOpacity={0.7}
          >
            <View style={styles.sortOptionTextWrap}>
              <Text style={[styles.sortOptionLabel, { color: colors.text }]}>
                По добавлению — старые выше
              </Text>
            </View>
            <View style={[styles.sortRadioOuter, { borderColor: colors.border }]}>
              {sortBy === 'added-old' && (
                <View style={[styles.sortRadioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortOption}
            onPress={() => handleSelectSort('name-az')}
            activeOpacity={0.7}
          >
            <View style={styles.sortOptionTextWrap}>
              <Text style={[styles.sortOptionLabel, { color: colors.text }]}>
                По названию — A → Я
              </Text>
            </View>
            <View style={[styles.sortRadioOuter, { borderColor: colors.border }]}>
              {sortBy === 'name-az' && (
                <View style={[styles.sortRadioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortOption}
            onPress={() => handleSelectSort('name-za')}
            activeOpacity={0.7}
          >
            <View style={styles.sortOptionTextWrap}>
              <Text style={[styles.sortOptionLabel, { color: colors.text }]}>
                По названию — Я → A
              </Text>
            </View>
            <View style={[styles.sortRadioOuter, { borderColor: colors.border }]}>
              {sortBy === 'name-za' && (
                <View style={[styles.sortRadioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortOption}
            onPress={() => handleSelectSort('score')}
            activeOpacity={0.7}
          >
            <View style={styles.sortOptionTextWrap}>
              <Text style={[styles.sortOptionLabel, { color: colors.text }]}>
                По очкам тренировки
              </Text>
            </View>
            <View style={[styles.sortRadioOuter, { borderColor: colors.border }]}>
              {sortBy === 'score' && (
                <View style={[styles.sortRadioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
  lastUpdated: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
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
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
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
  wordForeign: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  wordNative: {
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

  // ── Bottom sheet (shared via BottomSheet component) ──
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
  sheetPreviewForeign: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  sheetPreviewNative: {
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
  // Sort sheet
  sortBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sortSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  sortTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sortSubtitle: {
    fontSize: typography.small,
    marginBottom: spacing.sm,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  sortOptionTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  sortOptionLabel: {
    fontSize: typography.body,
  },
  sortRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
