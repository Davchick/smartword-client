import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Dumbbell, Crown } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { SwipeCard } from '../../components/SwipeCard';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useProfile } from '../../hooks/useProfile';
import { useTrainingSession } from '../../hooks/useTrainingSession';
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit';
import { PaywallModal } from '../../components/PaywallModal';
import type { TrainingScreenProps, TabTrainingScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

type Props = TrainingScreenProps | TabTrainingScreenProps;

const CARDS_VISIBLE = 3;

type Round = 'initial' | 'retry';

export const TrainingScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const params = 'params' in route ? route.params : undefined;
  const groupId = params && 'groupId' in params ? params.groupId : undefined;
  const groupName = params && 'groupName' in params ? params.groupName : 'Все слова';
  const insets = useSafeAreaInsets();

  const { words, loading, updateWordProgress, getTrainingWords, refetch: refetchWords } = useWords(groupId);
  const { profile, refetch: refetchProfile } = useProfile();
  const { sessionActive, sessionPoints: _sessionPoints, startSession, recordWord, flushSession } = useTrainingSession();
  const {
    weeklyLimitReached,
    wordsLearnedThisWeek,
    weeklyLimit,
    incrementAndCheck,
    checkLimit,
    resetLocal,
  } = useWeeklyLimit();

  const [trainingWords, setTrainingWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ knew: 0, didntKnow: 0 });
  const [initialTotal, setInitialTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [round, setRound] = useState<Round>('initial');
  const initialWrongIdsRef = useRef<Set<string>>(new Set());
  const retryTotalRef = useRef(0);
  const canGoBack = navigation.canGoBack();
  const [isProcessing, setIsProcessing] = useState(false);
  const [wordsLearnedInSession, setWordsLearnedInSession] = useState(0);
  const processingRef = useRef(false); // Ref-дубль для мгновенной проверки в race condition

  // Ref для предотвращения повторной инициализации при ре-рендере
  const initializedRef = useRef(false);

  // Инициализация тренировки — вызывается один раз при загрузке слов
  const initTraining = useCallback(() => {
    const tw = getTrainingWords();
    setTrainingWords(tw);
    setInitialTotal(tw.length);
    setCurrentIndex(0);
    setStats({ knew: 0, didntKnow: 0 });
    setFinished(false);
    setRound('initial');
    initialWrongIdsRef.current = new Set();
    retryTotalRef.current = 0;
    initializedRef.current = true;
    startSession(groupId, groupName);
  }, [getTrainingWords, groupId, groupName, startSession]);

  // Проверяем лимит и инициализируем тренировку при загрузке данных
  useEffect(() => {
    if (loading || words.length === 0) {
      initializedRef.current = false;
      return;
    }

    if (weeklyLimitReached) {
      return;
    }

    // Проверяем лимит через единый хук
    if (checkLimit()) {
      return;
    }

    if (!initializedRef.current) {
      initTraining();
    }
  }, [loading, words.length, weeklyLimitReached, checkLimit, initTraining]);

  // Завершаем тренировку когда retry-опустел
  useEffect(() => {
    if (round === 'retry' && trainingWords.length === 0 && !finished && !loading) {
      setFinished(true);
    }
  }, [round, trainingWords.length, finished, loading]);

  // Flush сессии при выходе из тренировки
  useFocusEffect(
    useCallback(() => {
      return () => {
        void flushSession();
        // Сбрасываем isProcessing при размонтировании — предотвращает
        // зависание состояния если свайп/нажатие произошло во время unmount
        setIsProcessing(false);
        processingRef.current = false;
      };
    }, [flushSession])
  );

  const formatScore = (value: number) => {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  };

  const handleSwipe = async (knew: boolean) => {
    if (isProcessing || processingRef.current) return;
    if (weeklyLimitReached && !profile?.is_premium) return;

    const currentWord = trainingWords[currentIndex];
    if (!currentWord) return;

    setIsProcessing(true);
    processingRef.current = true;

    try {
      if (round === 'retry') {
        if (knew) {
          await updateWordProgress(currentWord.id, true, { correctDelta: 0.5, offline: true });
          recordWord(currentWord.id, knew, { correctDelta: 0.5, incorrectDelta: 0, points: 0.5 });
        } else {
          await updateWordProgress(currentWord.id, false, { incorrectDelta: 0, offline: true });
          recordWord(currentWord.id, knew, { correctDelta: 0, incorrectDelta: 0, points: 0 });
        }
      } else {
        await updateWordProgress(currentWord.id, knew, { offline: true });

        const wasLearnedBefore = currentWord.correct_count >= 5;
        const isNowLearned = knew && (currentWord.correct_count + 1) >= 5;
        const justLearned = !wasLearnedBefore && isNowLearned;

        if (justLearned && knew) {
          setWordsLearnedInSession((prev) => prev + 1);
          incrementAndCheck(1);
        }

        recordWord(currentWord.id, knew, { points: knew ? 1 : 0 });
      }

      if (round === 'initial') {
        setStats((prev) => ({
          knew: knew ? prev.knew + 1 : prev.knew,
          didntKnow: !knew ? prev.didntKnow + 1 : prev.didntKnow,
        }));
        if (!knew) initialWrongIdsRef.current.add(currentWord.id);
      } else {
        if (knew) {
          setStats((prev) => ({ ...prev, knew: prev.knew + 0.5 }));
        }
      }

      if (round === 'retry') {
        setTrainingWords((prev) => {
          if (prev.length === 0) return prev;
          const head = prev[0]!;
          const tail = prev.slice(1);
          return knew ? tail : [...tail, head];
        });
        setCurrentIndex(0);
        setIsProcessing(false);
        return;
      }

      if (currentIndex + 1 >= trainingWords.length) {
        if (initialWrongIdsRef.current.size > 0) {
          const retryWords = trainingWords.filter((w) => initialWrongIdsRef.current.has(w.id));
          if (retryWords.length > 0) {
            retryTotalRef.current = retryWords.length;
            setTrainingWords(retryWords);
            setCurrentIndex(0);
            setRound('retry');
            setIsProcessing(false);
            return;
          }
        }
        setFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error('[Training] handleSwipe error:', err);
    }

    setIsProcessing(false);
    processingRef.current = false;
  };

  const handleRestart = async () => {
    if (checkLimit()) return;

    await flushSession();

    const tw = getTrainingWords();
    setTrainingWords(tw);
    setInitialTotal(tw.length);
    setCurrentIndex(0);
    setStats({ knew: 0, didntKnow: 0 });
    setFinished(false);
    setRound('initial');
    initialWrongIdsRef.current = new Set();
    retryTotalRef.current = 0;
    setWordsLearnedInSession(0);
    resetLocal();
    startSession(groupId, groupName);
  };

  // ─── Render: Loading ───
  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ─── Render: No words ───
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

  // ─── Render: Weekly limit reached ───
  if (weeklyLimitReached && !profile?.is_premium) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.resultEmoji}>🔒</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Лимит на этой неделе исчерпан</Text>
          <Text style={[styles.resultSubtitle, { color: colors.muted }]}>
            Вы выучили {wordsLearnedThisWeek} из {weeklyLimit} слов
          </Text>

          <View style={[styles.limitCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.limitText, { color: colors.text }]}>
              🎉 Это отличнo! Вы выучили {weeklyLimit} слов на этой неделе.
            </Text>
            <Text style={[styles.limitSubText, { color: colors.muted }]}>
              Но больше слов выучить нельзя до понедельника.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.premiumButton,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 8,
              },
            ]}
            onPress={() => setPaywallVisible(true)}
            activeOpacity={0.85}
          >
            <Crown color={colors.background} size={20} />
            <Text style={[styles.premiumButtonText, { color: colors.background }]}>
              Оформить Premium — учиться без ограничений
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToGroupButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backToGroupText, { color: colors.muted }]}>Назад к словарю</Text>
          </TouchableOpacity>
        </View>

        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          reason="words"
        />
      </View>
    );
  }

  // Отслеживаем достижение лимита во время сессии — вынесено в useEffect
  // чтобы избежать side-effect в render-методе (checkLimit вызывает setState)
  const [hitLimitThisSession, setHitLimitThisSession] = useState(false);

  useEffect(() => {
    if (finished && !profile?.is_premium) {
      setHitLimitThisSession(checkLimit());
    }
  }, [finished, profile?.is_premium, checkLimit]);

  // ─── Render: Finished ───
  if (finished) {
    const total = initialTotal;
    const percent = total > 0 ? Math.round((stats.knew / total) * 100) : 0;

    const remainingWords = getTrainingWords();
    const allWordsArchived = remainingWords.length === 0;

    if (hitLimitThisSession && !profile?.is_premium) {
      return (
        <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.resultEmoji}>🔒</Text>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Лимит на этой неделе исчерпан</Text>
            <Text style={[styles.resultSubtitle, { color: colors.muted }]}>
              Вы выучили {wordsLearnedThisWeek} из {weeklyLimit} слов
            </Text>

            <View style={[styles.limitCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Text style={[styles.limitText, { color: colors.text }]}>
                🎉 Это отличнo! Вы выучили {weeklyLimit} слов на этой неделе.
              </Text>
              <Text style={[styles.limitSubText, { color: colors.muted }]}>
                Но больше слов выучить нельзя до понедельника.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.premiumButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                  elevation: 8,
                },
              ]}
              onPress={() => setPaywallVisible(true)}
              activeOpacity={0.85}
            >
              <Crown color={colors.background} size={20} />
              <Text style={[styles.premiumButtonText, { color: colors.background }]}>
                Оформить Premium — учиться без ограничений
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToGroupButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backToGroupText, { color: colors.muted }]}>Назад к словарю</Text>
            </TouchableOpacity>
          </View>

          <PaywallModal
            visible={paywallVisible}
            onClose={() => setPaywallVisible(false)}
            reason="words"
          />
        </View>
      );
    }

    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.resultEmoji}>{allWordsArchived ? '🎓' : percent >= 80 ? '🎉' : percent >= 50 ? '💪' : '📚'}</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {allWordsArchived ? 'Все слова выучены!' : 'Тренировка завершена!'}
          </Text>
          <Text style={[styles.resultSubtitle, { color: colors.muted }]}>{groupName}</Text>

          {!allWordsArchived && (
            <View style={[styles.statsRow, { backgroundColor: colors.elevated }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{formatScore(stats.knew)}</Text>
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
          )}

          {allWordsArchived ? (
            <View style={[styles.successCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Text style={[styles.successTitle, { color: colors.success }]}>
                🎉 Отличная работа!
              </Text>
              <Text style={[styles.successText, { color: colors.muted }]}>
                Все слова из этого словаря выучены и отправлены в архив.
              </Text>
              <Text style={[styles.successSubText, { color: colors.muted }]}>
                Вы можете вернуться к словарю и добавить новые слова для продолжения тренировок.
              </Text>
            </View>
          ) : weeklyLimitReached && !profile?.is_premium ? (
            <View style={[styles.successCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Text style={[styles.successTitle, { color: colors.muted }]}>
                🔒 Лимит на этой неделе исчерпан
              </Text>
              <Text style={[styles.successText, { color: colors.muted }]}>
                Вы выучили {weeklyLimit} слов. Возвращайтесь в понедельник для продолжения тренировок!
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.restartButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                  elevation: 8,
                },
              ]}
              onPress={handleRestart}
              activeOpacity={0.8}
            >
              <RotateCcw color={colors.background} size={18} />
              <Text style={[styles.restartButtonText, { color: colors.background }]}>Ещё раз</Text>
            </TouchableOpacity>
          )}

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
                style={[
                  styles.premiumHintButton,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 8,
                  },
                ]}
                onPress={() => setPaywallVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.premiumHintButtonText, { color: colors.background }]}>Узнать о Premium</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backToGroupButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backToGroupText, { color: colors.muted }]}>Назад к словарю</Text>
          </TouchableOpacity>
        </View>

        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          reason="words"
        />
      </View>
    );
  }

  // ─── Render: Active training ───
  const visibleCards = trainingWords.slice(currentIndex, currentIndex + CARDS_VISIBLE);
  const progress =
    trainingWords.length > 0
      ? round === 'retry'
        ? 1 - trainingWords.length / Math.max(1, retryTotalRef.current || trainingWords.length)
        : currentIndex / trainingWords.length
      : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {canGoBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitlesAbsolute} pointerEvents="none">
          <Text style={[styles.headerTitle, { color: colors.text }]}>{groupName}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {round === 'retry'
              ? `Повторение ${currentIndex + 1}/${trainingWords.length}`
              : `${currentIndex + 1} / ${trainingWords.length}`}
          </Text>
        </View>
        <Text style={[styles.counterLeft, { color: colors.danger }]}>{stats.didntKnow}</Text>
        <View style={styles.headerSpacer} />
        <Text style={[styles.counterRight, { color: colors.success }]}>{formatScore(stats.knew)}</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
      </View>

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
              disabled={isProcessing}
            />
          );
        })}
      </View>

      <View style={[styles.buttonsRow, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.actionButtonLeft,
            {
              borderColor: colors.danger,
              opacity: isProcessing ? 0.5 : 1,
            },
          ]}
          onPress={() => handleSwipe(false)}
          activeOpacity={0.8}
          disabled={isProcessing}
        >
          <Text style={[styles.actionButtonText, { color: colors.danger }]}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.actionButtonRight,
            {
              borderColor: colors.success,
              opacity: isProcessing ? 0.5 : 1,
            },
          ]}
          onPress={() => handleSwipe(true)}
          activeOpacity={0.8}
          disabled={isProcessing}
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
  successCard: {
    width: '100%',
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  successText: {
    fontSize: typography.small,
    textAlign: 'center',
    lineHeight: 20,
  },
  successSubText: {
    fontSize: typography.xs,
    textAlign: 'center',
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
  limitCard: {
    width: '100%',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  limitText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  limitSubText: {
    fontSize: typography.small,
    textAlign: 'center',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
    justifyContent: 'center',
  },
  premiumButtonText: {
    fontWeight: '700',
    fontSize: typography.body,
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
