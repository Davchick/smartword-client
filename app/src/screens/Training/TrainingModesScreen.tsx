import React, { useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { GroupsStackParamList, MainTabParamList } from '../../navigation/types';
import type { WordGroup } from '../../hooks/useGroups';

type StackProps = NativeStackScreenProps<GroupsStackParamList, 'TrainingModes'>;
type TabProps = BottomTabScreenProps<MainTabParamList, 'TrainingTab'>;
type Props = StackProps | TabProps;

export const TrainingModesScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groups } = useGroups();

  const params = 'params' in route ? route.params : undefined;
  const groupId = params && 'groupId' in params ? params.groupId : undefined;
  const groupName = params && 'groupName' in params && params.groupName ? params.groupName : 'Все слова';
  const isTab = !('params' in route && route.params && 'groupId' in route.params && route.params.groupId);

  // For tab mode: two-step flow — pick a group, then pick a mode
  const [selectedGroup, setSelectedGroup] = useState<WordGroup | null>(null);

  const navigateToTraining = (screen: 'Training' | 'TrainingWrite', gId?: string, gName?: string) => {
    if (isTab && (gId == null || gId === '')) return;
    if (isTab) {
      // Navigate into GroupsStack via parent tab navigator
      (navigation as any).navigate('GroupsTab', {
        screen,
        params: { groupId: gId, groupName: gName },
      });
      return;
    }
    (navigation as StackProps['navigation']).navigate(screen, { groupId, groupName });
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

  // Tab mode: show group picker only when there are 2+ groups and none selected yet
  if (isTab && !selectedGroup && groups.length > 1) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, styles.headerTitleLarge, { color: colors.text }]}>Тренировка</Text>
            <Text style={[styles.headerSubtitleTab, { color: colors.muted }]}>Выберите словарь для тренировки</Text>
          </View>
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <BookOpen color={colors.muted} size={48} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет словарей</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Создайте словарь на вкладке «Словари» и добавьте слова
            </Text>
          </View>
        ) : (
          <FlatList
            data={groups}
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
                  <Text style={[styles.groupCount, { color: colors.muted }]}>{item.word_count} слов</Text>
                </View>
                <ChevronRight color={colors.muted} size={18} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // Tab mode with no groups — show empty state
  if (isTab && groups.length === 0) {
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
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет словарей</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Создайте словарь на вкладке «Словари» и добавьте слова
          </Text>
        </View>
      </View>
    );
  }

  // Tab mode: one group → use it; several → use selected. Stack mode: use params.
  const activeGroupId = isTab
    ? (groups.length === 1 ? groups[0]?.id : selectedGroup?.id)
    : groupId;
  const activeGroupName = isTab
    ? (groups.length === 1 ? groups[0]?.name : selectedGroup?.name)
    : groupName;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {(isTab ? groups.length > 1 : true) && (
          <TouchableOpacity
            onPress={() => {
              if (isTab) {
                setSelectedGroup(null);
              } else {
                (navigation as StackProps['navigation']).goBack();
              }
            }}
            style={[styles.backButton, { backgroundColor: colors.primaryDim }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft color={colors.primary} size={22} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, isTab && styles.headerTitleLarge, { color: colors.text }]}>
            {isTab ? 'Режим тренировки' : 'Режим тренировки'}
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
    alignItems: 'flex-start',
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
    gap: 5,
    paddingTop: 2,
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
