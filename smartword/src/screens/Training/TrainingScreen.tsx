import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Dumbbell, Crown } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { SwipeCard } from '../../components/SwipeCard';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useProfile } from '../../hooks/useProfile';
import { PaywallModal } from '../../components/PaywallModal';
import type { TrainingScreenProps, TabTrainingScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

type Props = TrainingScreenProps | TabTrainingScreenProps;

const CARDS_VISIBLE = 3;

export const TrainingScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const params = 'params' in route ? route.params : undefined;
  const groupId = params && 'groupId' in params ? params.groupId : undefined;
  const groupName = params && 'groupName' in params ? params.groupName : 'Все слова';
  const insets = useSafeAreaInsets();

  const { words, loading, updateWordProgress, getTrainingWords } = useWords(groupId);
  const { profile } = useProfile();
  const [trainingWords, setTrainingWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ knew: 0, didntKnow: 0 });
  const [finished, setFinished] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const canGoBack = navigation.canGoBack();

  useEffect(() => {
    if (!loading && words.length > 0) {
      setTrainingWords(getTrainingWords());
      setCurrentIndex(0);
      setStats({ knew: 0, didntKnow: 0 });
      setFinished(false);
    }
  }, [loading]);

  const handleSwipe = async (knew: boolean) => {
    const currentWord = trainingWords[currentIndex];
    if (!currentWord) return;

    await updateWordProgress(currentWord.id, knew);

    setStats((prev) => ({
      knew: knew ? prev.knew + 1 : prev.knew,
      didntKnow: !knew ? prev.didntKnow + 1 : prev.didntKnow,
    }));

    if (currentIndex + 1 >= trainingWords.length) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setTrainingWords(getTrainingWords());
    setCurrentIndex(0);
    setStats({ knew: 0, didntKnow: 0 });
    setFinished(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (words.length === 0) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          )}
        </View>
        <Dumbbell color={colors.muted} size={56} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет слов для тренировки</Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Добавьте слова в словарь, чтобы начать</Text>
      </View>
    );
  }

  if (finished) {
    const total = stats.knew + stats.didntKnow;
    const percent = total > 0 ? Math.round((stats.knew / total) * 100) : 0;

    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.resultEmoji}>{percent >= 80 ? '🎉' : percent >= 50 ? '💪' : '📚'}</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Тренировка завершена!</Text>
          <Text style={[styles.resultSubtitle, { color: colors.muted }]}>{groupName}</Text>

          <View style={[styles.statsRow, { backgroundColor: colors.elevated }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.knew}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Знаю</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.danger }]}>{stats.didntKnow}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Не знаю</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{percent}%</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Результат</Text>
            </View>
          </View>

          {!profile?.is_premium && (
            <View style={[styles.premiumHintCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <View style={styles.premiumHintHeader}>
                <Crown color={colors.primary} size={18} />
                <Text style={[styles.premiumHintTitle, { color: colors.text }]}>Тренируйтесь без ограничений</Text>
              </View>
              <Text style={[styles.premiumHintText, { color: colors.muted }]}>
                Откройте все словари, больше слов и неограниченные тренировки с SmartWord Premium.
              </Text>
              <TouchableOpacity
                style={[styles.premiumHintButton, { backgroundColor: colors.primary }]}
                onPress={() => setPaywallVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.premiumHintButtonText, { color: colors.background }]}>Узнать о Premium</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.restartButton, { backgroundColor: colors.primary }]} onPress={handleRestart} activeOpacity={0.8}>
            <RotateCcw color={colors.background} size={18} />
            <Text style={[styles.restartButtonText, { color: colors.background }]}>Ещё раз</Text>
          </TouchableOpacity>

          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backToGroupButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backToGroupText, { color: colors.muted }]}>Назад к словарю</Text>
            </TouchableOpacity>
          )}
        </View>

        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          reason="words"
        />
      </View>
    );
  }

  const visibleCards = trainingWords.slice(currentIndex, currentIndex + CARDS_VISIBLE);
  const progress = currentIndex / trainingWords.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {canGoBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        )}
        {/* Название строго по центру экрана */}
        <View style={styles.headerTitlesAbsolute} pointerEvents="none">
          <Text style={[styles.headerTitle, { color: colors.text }]}>{groupName}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {currentIndex + 1} / {trainingWords.length}
          </Text>
        </View>
        {/* Счётчики по краям */}
        <Text style={[styles.counterLeft, { color: colors.danger }]}>{stats.didntKnow}</Text>
        <View style={styles.headerSpacer} />
        <Text style={[styles.counterRight, { color: colors.success }]}>{stats.knew}</Text>
      </View>

      {/* Прогресс-бар */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
      </View>

      {/* Стек карточек */}
      <View style={styles.cardsContainer}>
        {[...visibleCards].reverse().map((word, reversedIndex) => {
          const stackIndex = visibleCards.length - 1 - reversedIndex;
          return (
            <SwipeCard
              key={word.id}
              word={word}
              isTop={stackIndex === 0}
              stackIndex={stackIndex}
              onSwipeRight={() => handleSwipe(true)}
              onSwipeLeft={() => handleSwipe(false)}
            />
          );
        })}
      </View>

      {/* Кнопки-подсказки */}
      <View style={[styles.buttonsRow, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonLeft, { borderColor: colors.danger }]}
          onPress={() => handleSwipe(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, { color: colors.danger }]}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonRight, { borderColor: colors.success }]}
          onPress={() => handleSwipe(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, { color: colors.success }]}>✓</Text>
        </TouchableOpacity>
      </View>
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
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerNoBack: {
    justifyContent: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitlesAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerSpacer: { flex: 1 },
  counterLeft: {
    fontSize: 22,
    fontFamily: fonts.black,
    width: 40,
    textAlign: 'left',
  },
  counterRight: {
    fontSize: 22,
    fontFamily: fonts.black,
    width: 40,
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: typography.small,
  },
  progressBar: {
    height: 3,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  actionButtonLeft: {
    backgroundColor: 'rgba(251, 113, 133, 0.1)',
  },
  actionButtonRight: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  actionButtonText: {
    fontSize: 26,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    width: '88%',
  },
  resultEmoji: {
    fontSize: 52,
  },
  resultTitle: {
    fontSize: typography.subtitle,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: typography.small,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: typography.title,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: typography.small,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
    justifyContent: 'center',
  },
  restartButtonText: {
    fontWeight: '700',
    fontSize: typography.body,
  },
  backToGroupButton: {
    padding: spacing.sm,
  },
  backToGroupText: {
    fontSize: typography.small,
  },
  premiumHintCard: {
    width: '100%',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
  },
  premiumHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumHintTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  premiumHintText: {
    fontSize: typography.small,
    lineHeight: 20,
  },
  premiumHintButton: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumHintButtonText: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
  },
  emptyTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body,
    textAlign: 'center',
  },
});
