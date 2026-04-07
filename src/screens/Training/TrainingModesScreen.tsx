import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Layers, PenLine, Bot, BookOpen, ChevronRight } from 'lucide-react-native';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
import { useGroups } from '../../hooks/useGroups';
import { useWords } from '../../hooks/useWords';
import { pluralizeRu } from '../../lib/pluralizeRu';
import { requestNotificationPermissions } from '../../lib/notifications';
import { ARCHIVE_THRESHOLD } from '../../constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { GroupsStackParamList, MainTabParamList, TrainingStackParamList } from '../../navigation/types';
import type { WordGroup } from '../../hooks/useGroups';

type Props = NativeStackScreenProps<GroupsStackParamList, 'TrainingModes'> | NativeStackScreenProps<TrainingStackParamList, 'TrainingModes'> | BottomTabScreenProps<MainTabParamList, 'TrainingTab'>;

export const TrainingModesScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groups } = useGroups();
  const { words } = useWords(undefined, { fields: ['group_id', 'correct_count'] });
  const notificationsRequestedRef = useRef(false);

  // Запрашиваем разрешения на уведомления при первом входе в тренировку
  React.useEffect(() => {
    if (!notificationsRequestedRef.current) {
      notificationsRequestedRef.current = true;
      requestNotificationPermissions();
    }
  }, []);

  const activeCountsByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of words) {
      if (w.correct_count < ARCHIVE_THRESHOLD) {
        map[w.group_id] = (map[w.group_id] ?? 0) + 1;
      }
    }
    return map;
  }, [words]);

  // Auto-select group if only one has words to train
  const groupWithWords = useMemo(() => {
    const groupsWithWords = groups.filter(g => (activeCountsByGroup[g.id] ?? 0) > 0);
    if (groupsWithWords.length === 1) {
      return groupsWithWords[0];
    }
    return null;
  }, [groups, activeCountsByGroup]);

  const params = 'params' in route ? route.params : undefined;
  const groupId = params && 'groupId' in params ? params.groupId : undefined;
  const groupName = params && 'groupName' in params && params.groupName ? params.groupName : 'Все слова';

  // For tab mode: two-step flow — pick a group, then pick a mode
  const [selectedGroup, setSelectedGroup] = useState<WordGroup | null>(null);

  // Если groupId передан в TrainingTab, сразу используем его
  const groupFromParams = useMemo(() => {
    if (groupId) {
      return groups.find(g => g.id === groupId) || null;
    }
    return null;
  }, [groupId, groups]);

  // Auto-select group если ещё не выбран и есть кандидат
  React.useEffect(() => {
    if (groupFromParams) {
      setSelectedGroup(groupFromParams);
    } else if (groupWithWords) {
      setSelectedGroup(groupWithWords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFromParams, groupWithWords]);

  const navigateToTraining = (screen: 'Training' | 'TrainingWrite', gId?: string, gName?: string) => {
    const targetGroupId = gId || activeGroupId;
    const targetGroupName = gName || activeGroupName;

    if (!targetGroupId) {
      return;
    }

    // Переходим на экран тренировки в текущем стеке
    (navigation as any).navigate(screen, { groupId: targetGroupId, groupName: targetGroupName });
  };

  const modes = [
    {
      key: 'swipe',
      title: 'Знаю / Не знаю',
      subtitle: 'Листайте карточки и отмечайте что знаете. Быстрый способ повторить весь словарь.',
      icon: Layers,
      onPress: (gId?: string, gName?: string) => navigateToTraining('Training', gId, gName),
    },
    {
      key: 'write',
      title: 'Напиши слово',
      subtitle: 'Видите перевод — вспомните и напечатайте слово. Глубокое закрепление.',
      icon: PenLine,
      onPress: (gId?: string, gName?: string) => navigateToTraining('TrainingWrite', gId, gName),
    },
    {
      key: 'ai',
      title: 'Практика с ИИ',
      subtitle: 'Общайтесь с ИИ на языке словаря. Живая разговорная практика.',
      icon: Bot,
      onPress: () => {
        try {
          (navigation as any).navigate('ChatTab');
        } catch {
          (navigation as any).getParent()?.navigate('ChatTab');
        }
      },
    },
  ];

  // Show group picker only when there are 2+ groups with words and none selected yet
  if (!groupId && !selectedGroup && groups.filter(g => (activeCountsByGroup[g.id] ?? 0) > 0).length > 1) {
    const groupsWithWords = groups.filter(g => (activeCountsByGroup[g.id] ?? 0) > 0);
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, styles.headerTitleLarge, { color: colors.text }]}>Тренировка</Text>
            <Text style={[styles.headerSubtitleTab, { color: colors.muted }]}>Выберите словарь для тренировки</Text>
          </View>
        </View>

        {groupsWithWords.length === 0 ? (
          <View style={styles.emptyWrap}>
            <BookOpen color={colors.muted} size={48} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет слов для тренировки</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Добавьте слова в словарь или повторите слова, которые нужно подтянуть
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupsWithWords}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.groupList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.75}
                onPress={() => setSelectedGroup(item)}
              >
                <View style={[styles.groupIconWrap, { backgroundColor: colors.primaryDim }]}>
                  <BookOpen color={colors.primary} size={18} />
                </View>
                <View style={styles.groupTextBlock}>
                  <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.language ? (
                    <Text style={[styles.groupLang, { color: colors.primary }]}>{item.language}</Text>
                  ) : null}
                  {(() => {
                    const activeCount = activeCountsByGroup[item.id] ?? 0;
                    const label = `${activeCount} ${pluralizeRu(activeCount, ['слово', 'слова', 'слов'])}`;
                    return (
                      <Text style={[styles.groupCount, { color: colors.muted }]}>
                        {label}
                      </Text>
                    );
                  })()}
                </View>
                <ChevronRight color={colors.muted} size={18} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // Show empty state when no groups or no words
  if (!groupId && (groups.length === 0 || groups.filter(g => (activeCountsByGroup[g.id] ?? 0) > 0).length === 0)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, styles.headerTitleLarge, { color: colors.text }]}>Тренировка</Text>
            <Text style={[styles.headerSubtitleTab, { color: colors.muted }]}>Выберите словарь для тренировки</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <BookOpen color={colors.muted} size={48} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет слов для тренировки</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Добавьте слова в словарь или повторите слова, которые нужно подтянуть
          </Text>
        </View>
      </View>
    );
  }

  // Tab mode: one group with words → use it; several → use selected. Stack mode: use params.
  const activeGroupId = groupId || (groupWithWords ? groupWithWords.id : selectedGroup?.id);
  const activeGroupName = groupId ? groupName : (groupWithWords ? groupWithWords.name : selectedGroup?.name);
  // Кнопка "назад" показывается только когда groupId передан (переход из словаря)
  const showBackButton = !!groupId;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
            }}
            style={[styles.backButton, { backgroundColor: colors.primaryDim }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft color={colors.primary} size={22} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Режим тренировки
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]} numberOfLines={1}>
            {activeGroupName}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.82}
            onPress={() => mode.onPress(activeGroupId, activeGroupName)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryDim }]}>
              <mode.icon color={colors.primary} size={22} />
            </View>
            <View style={styles.modeTextBlock}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>{mode.title}</Text>
              <Text style={[styles.modeSubtitle, { color: colors.muted }]}>{mode.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  headerTitleLarge: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
  },
  headerSubtitle: {
    fontSize: typography.small,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  headerSubtitleTab: {
    fontSize: typography.small,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  // Group picker
  groupList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 40,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  groupIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTextBlock: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
  },
  groupLang: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
  },
  groupCount: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Mode picker
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextBlock: {
    flex: 1,
    gap: 4,
  },
  modeTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  modeSubtitle: {
    fontSize: typography.small,
    lineHeight: 20,
  },
});
