import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  BackHandler,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Dumbbell, Crown } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { SwipeCard } from '../../components/SwipeCard';
import { useTheme, fonts } from '../../theme';
import { useProfile } from '../../hooks/useProfile';
import { useTrainingSession } from '../../hooks/useTrainingSession';
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit';
import { useToast } from '../../components/Toast';
import { SkeletonScreen } from '../../components/ui/SkeletonScreen';
import { ARCHIVE_THRESHOLD } from '../../constants';
import { useDeviceSize } from '../../hooks/useDeviceSize';
import { useResponsiveTypography } from '../../hooks/useResponsiveTypography';
import { moderateScale, verticalScale } from '../../utils/responsive';
import type { TrainingScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

type Props = TrainingScreenProps;

const CARDS_VISIBLE = 3;

type Round = 'initial' | 'retry';

export const TrainingScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceSize = useDeviceSize();
  const typography = useResponsiveTypography();
  const styles = useTrainingStyles();
  const params = 'params' in route ? route.params : undefined;
  const groupId = params && 'groupId' in params ? params.groupId : undefined;
  const groupName = params && 'groupName' in params ? params.groupName : 'Все слова';
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

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
  const [round, setRound] = useState<Round>('initial');
  const initialWrongIdsRef = useRef<Set<string>>(new Set());
  const retryTotalRef = useRef(0);
  const canGoBack = navigation.canGoBack();
  const [isProcessing, setIsProcessing] = useState(false);
  const [wordsLearnedInSession, setWordsLearnedInSession] = useState(0);
  const [retryRenderNonce, setRetryRenderNonce] = useState(0);

  // Отслеживаем достижение лимита во время сессии
  const [hitLimitThisSession, setHitLimitThisSession] = useState(false);

  const processingRef = useRef(false); // Ref-дубль для мгновенной проверки в race condition

  // Ref для предотвращения повторной инициализации при ре-рендере
  const initializedRef = useRef(false);
  const availableTrainingWords = getTrainingWords();

  // Отслеживаем достижение лимита во время сессии
  useEffect(() => {
    if (finished && !profile?.is_premium) {
      setHitLimitThisSession(checkLimit());
    }
  }, [finished, profile?.is_premium, checkLimit]);

  // Инициализация тренировки — вызывается один раз при загрузке слов
  const initTraining = useCallback(() => {
    const tw = availableTrainingWords;
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
  }, [availableTrainingWords, groupId, groupName, startSession]);

  // Проверяем лимит и инициализируем тренировку при загрузке данных
  useEffect(() => {
    if (loading || words.length === 0 || availableTrainingWords.length === 0) {
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
  }, [loading, words.length, availableTrainingWords.length, weeklyLimitReached, checkLimit, initTraining]);

  // Завершаем тренировку когда retry-опустел
  useEffect(() => {
    if (round === 'retry' && trainingWords.length === 0 && !finished && !loading) {
      setFinished(true);
    }
  }, [round, trainingWords.length, finished, loading]);

  // Flush сессии при выходе из тренировки + hardware back button handler
  useFocusEffect(
    useCallback(() => {
      // Cleanup при размонтировании/уходе с экрана
      const cleanup = () => {
        void flushSession();
        // Сбрасываем isProcessing при размонтировании — предотвращает
        // зависание состояния если свайп/нажатие произошло во время unmount
        setIsProcessing(false);
        processingRef.current = false;
      };

      // Hardware back button → goBack (к TrainingModes)
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true; // перехватили
      });

      return () => {
        cleanup();
        backHandler.remove();
      };
    }, [flushSession, navigation])
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

        const wasLearnedBefore = currentWord.correct_count >= ARCHIVE_THRESHOLD;
        const isNowLearned = knew && (currentWord.correct_count + 1) >= ARCHIVE_THRESHOLD;
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
        const shouldForceRemountTopCard = !knew && trainingWords.length === 1;
        setTrainingWords((prev) => {
          if (prev.length === 0) return prev;
          const head = prev[0]!;
          const tail = prev.slice(1);
          return knew ? tail : [...tail, head];
        });
        if (shouldForceRemountTopCard) {
          setRetryRenderNonce((prev) => prev + 1);
        }
        setCurrentIndex(0);
        setIsProcessing(false);
        processingRef.current = false;
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
            processingRef.current = false;
            return;
          }
        }
        setFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err) {
      // Ошибка — НЕ переходим к следующему слову, показываем toast
      console.error('[Training] handleSwipe error:', err);
      setIsProcessing(false);
      processingRef.current = false;
      showToast('Не удалось сохранить прогресс. Попробуйте ещё раз.', 'error', 3000);
      return; // НЕ переходим к следующему слову
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
    return <SkeletonScreen type="training" showHeader={false} />;
  }

  // ─── Render: No words ───
  if (words.length === 0) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color={colors.text} size={moderateScale(24)} />
            </TouchableOpacity>
          )}
        </View>
        <Dumbbell color={colors.muted} size={moderateScale(56)} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет слов для тренировки</Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Добавьте слова в словарь, чтобы начать</Text>
      </View>
    );
  }

  // ─── Render: All words learned / nothing to train ───
  if (availableTrainingWords.length === 0 && !finished) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color={colors.text} size={moderateScale(24)} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.resultEmoji}>🎓</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Все слова выучены</Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          В этом словаре пока нет активных слов для повторения.
        </Text>
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
            activeOpacity={0.85}
          >
            <Crown color={colors.background} size={moderateScale(20)} />
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

  
      </View>
    );
  }

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
              activeOpacity={0.85}
            >
              <Crown color={colors.background} size={moderateScale(20)} />
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

          
        </View>
      );
    }

    const performanceTone =
      allWordsArchived
        ? 'Легендарно'
        : percent >= 85
          ? 'Супер фокус'
          : percent >= 60
            ? 'Хороший темп'
            : 'Разгон набран';

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.finishLayout,
            {
              paddingTop: insets.top + deviceSize.spacing.sm,
              paddingBottom: insets.bottom + deviceSize.spacing.md,
            },
          ]}
        >
          <View style={styles.finishContent}>
            <View style={[styles.finishHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.finishOrbTop, { backgroundColor: colors.primaryDim }]} />
              <View style={[styles.finishOrbBottom, { backgroundColor: colors.elevated }]} />

              <View style={[styles.finishBadge, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <Text style={[styles.finishBadgeText, { color: colors.primary }]}>{performanceTone}</Text>
              </View>

              <View style={[styles.finishEmojiWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <Text style={styles.resultEmoji}>{allWordsArchived ? '👑' : percent >= 80 ? '🚀' : percent >= 50 ? '🎯' : '🔥'}</Text>
              </View>

              <Text style={[styles.finishTitle, { color: colors.text }]}>
                {allWordsArchived ? 'Словарь закрыт на 100%' : 'Тренировка завершена'}
              </Text>
              <Text style={[styles.finishSubtitle, { color: colors.muted }]}>{groupName}</Text>

              <View style={styles.finishPillsRow}>
                <View style={[styles.finishPill, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Text style={[styles.finishPillValue, { color: colors.primary }]}>{total}</Text>
                  <Text style={[styles.finishPillLabel, { color: colors.muted }]}>Карточек</Text>
                </View>
                <View style={[styles.finishPill, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Text style={[styles.finishPillValue, { color: colors.success }]}>{percent}%</Text>
                  <Text style={[styles.finishPillLabel, { color: colors.muted }]}>Точность</Text>
                </View>
              </View>
            </View>

            <View style={styles.finishMetricsGrid}>
              <View style={[styles.finishMetricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.finishMetricValue, { color: colors.success }]}>{formatScore(stats.knew)}</Text>
                <Text style={[styles.finishMetricLabel, { color: colors.muted }]}>Знаю</Text>
              </View>
              <View style={[styles.finishMetricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.finishMetricValue, { color: colors.danger }]}>{stats.didntKnow}</Text>
                <Text style={[styles.finishMetricLabel, { color: colors.muted }]}>Не знаю</Text>
              </View>
              <View style={[styles.finishMetricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.finishMetricValue, { color: colors.primary }]}>{wordsLearnedInSession}</Text>
                <Text style={[styles.finishMetricLabel, { color: colors.muted }]}>Выучено за сессию</Text>
              </View>
            </View>

            {!profile?.is_premium && (
              <View style={[styles.finishPremiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.finishPremiumBadge, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <View style={styles.finishInlineIconBox}>
                    <Crown color={colors.primary} size={moderateScale(16)} />
                  </View>
                  <Text style={[styles.finishPremiumBadgeText, { color: colors.text }]}>Premium</Text>
                </View>
                <Text style={[styles.finishPremiumTitle, { color: colors.text }]}>
                  Ускорьте прогресс без ограничений
                </Text>
                <Text style={[styles.finishPremiumText, { color: colors.muted }]}>
                  Неограниченные тренировки, больше слов и быстрый рост словарного запаса.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.finishPremiumButton,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.35,
                      shadowRadius: 16,
                      elevation: 8,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.finishPremiumButtonText, { color: colors.background }]}>
                    Открыть Premium
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.finishActions}>
            <TouchableOpacity
              style={[
                styles.finishPrimaryButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 8,
                },
              ]}
              onPress={handleRestart}
              activeOpacity={0.85}
            >
            <View style={styles.finishInlineIconBox}>
              <RotateCcw color={colors.background} size={moderateScale(18)} />
            </View>
              <Text style={[styles.finishPrimaryButtonText, { color: colors.background }]}>Новый раунд</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.finishSecondaryButton} onPress={() => navigation.goBack()}>
              <Text style={[styles.finishSecondaryButtonText, { color: colors.muted }]}>Вернуться к словарю</Text>
            </TouchableOpacity>
          </View>
        </View>
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
            <ArrowLeft color={colors.text} size={moderateScale(24)} />
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
          const retryKeySuffix =
            round === 'retry' && trainingWords.length === 1 && stackIndex === 0
              ? `-retry-${retryRenderNonce}`
              : '';
          return (
            <SwipeCard
              key={`${word.id}${retryKeySuffix}`}
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

      <View style={[styles.buttonsRow, { paddingBottom: insets.bottom + deviceSize.spacing.lg }]}>
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

const useTrainingStyles = () => {
  const { isSmall, isLarge, spacing, typography, radii } = useDeviceSize();

  return {
    ...StyleSheet.create({
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
        fontSize: moderateScale(22),
        fontFamily: fonts.black,
        width: moderateScale(40),
        textAlign: 'left',
      },
      counterRight: {
        fontSize: moderateScale(22),
        fontFamily: fonts.black,
        width: moderateScale(40),
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
        height: moderateScale(3),
        marginHorizontal: spacing.lg,
        borderRadius: moderateScale(2),
      },
      progressFill: {
        height: '100%',
        borderRadius: moderateScale(2),
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
        width: moderateScale(64),
        height: moderateScale(64),
        borderRadius: moderateScale(32),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: moderateScale(2),
      },
      actionButtonLeft: {
        backgroundColor: 'rgba(251, 113, 133, 0.1)',
      },
      actionButtonRight: {
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
      },
      actionButtonText: {
        fontSize: moderateScale(26),
        fontWeight: '700',
      },
      resultCard: {
        borderRadius: radii.lg,
        padding: spacing.xl,
        marginHorizontal: spacing.lg,
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 1,
        width: '92%',
        maxWidth: moderateScale(560),
        overflow: 'hidden',
      },
      resultGlow: {
        position: 'absolute',
        top: -moderateScale(100),
        width: moderateScale(240),
        height: moderateScale(240),
        borderRadius: moderateScale(120),
        opacity: 0.35,
      },
      resultEmojiWrap: {
        width: moderateScale(96),
        height: moderateScale(96),
        borderRadius: moderateScale(48),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
      },
      resultEmoji: {
        fontSize: moderateScale(52),
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
      statsGrid: {
        width: '100%',
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
      },
      statCard: {
        flex: 1,
        minHeight: moderateScale(92),
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md,
      },
      statItem: {
        flex: 1,
        alignItems: 'center',
        gap: isSmall ? 3 : 4,
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
        height: moderateScale(40),
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
        includeFontPadding: false,
        lineHeight: verticalScale(22),
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
        lineHeight: verticalScale(20),
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
        flexShrink: 1,
      },
      premiumHintText: {
        fontSize: typography.small,
        lineHeight: verticalScale(20),
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
        includeFontPadding: false,
        lineHeight: verticalScale(22),
      },
      finishLayout: {
        flex: 1,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        justifyContent: 'space-between',
      },
      finishContent: {
        flex: 1,
        gap: spacing.sm,
        justifyContent: 'space-evenly',
      },
      finishActions: {
        marginTop: spacing.xs,
      },
      finishScrollContent: {
        paddingHorizontal: spacing.md,
        gap: spacing.md,
      },
      finishHeroCard: {
        borderRadius: radii.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        overflow: 'hidden',
        gap: spacing.xs,
      },
      finishOrbTop: {
        position: 'absolute',
        width: moderateScale(160),
        height: moderateScale(160),
        borderRadius: moderateScale(80),
        top: -moderateScale(110),
        right: -moderateScale(70),
        opacity: 0.25,
      },
      finishOrbBottom: {
        position: 'absolute',
        width: moderateScale(130),
        height: moderateScale(130),
        borderRadius: moderateScale(65),
        bottom: -moderateScale(90),
        left: -moderateScale(55),
        opacity: 0.22,
      },
      finishBadge: {
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
      },
      finishBadgeText: {
        fontSize: typography.small,
        fontFamily: fonts.headingBold,
      },
      finishEmojiWrap: {
        width: moderateScale(78),
        height: moderateScale(78),
        borderRadius: moderateScale(39),
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
      finishTitle: {
        fontSize: typography.subtitle,
        fontFamily: fonts.headingBold,
        textAlign: 'center',
        marginTop: spacing.xs,
      },
      finishSubtitle: {
        fontSize: typography.small,
        textAlign: 'center',
      },
      finishPillsRow: {
        width: '100%',
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xs,
      },
      finishPill: {
        flex: 1,
        borderWidth: 1,
        borderRadius: radii.md,
        paddingVertical: spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
      },
      finishPillValue: {
        fontSize: typography.subtitle,
        fontFamily: fonts.headingBold,
      },
      finishPillLabel: {
        fontSize: typography.xs,
      },
      finishMetricsGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        width: '100%',
      },
      finishMetricCard: {
        flex: 1,
        borderRadius: radii.md,
        borderWidth: 1,
        minHeight: moderateScale(76),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
      },
      finishMetricValue: {
        fontSize: typography.body,
        fontFamily: fonts.headingBold,
      },
      finishMetricLabel: {
        marginTop: spacing.xs,
        fontSize: typography.xs,
        textAlign: 'center',
      },
      finishPremiumCard: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        gap: spacing.xs,
        width: '100%',
      },
      finishPremiumBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderWidth: 1,
        borderRadius: radii.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      },
      finishInlineIconBox: {
        width: moderateScale(18),
        height: moderateScale(18),
        alignItems: 'center',
        justifyContent: 'center',
      },
      finishPremiumBadgeText: {
        fontSize: typography.small,
        fontFamily: fonts.medium,
        includeFontPadding: false,
        lineHeight: verticalScale(18),
      },
      finishPremiumTitle: {
        fontSize: typography.small,
        fontFamily: fonts.headingBold,
      },
      finishPremiumText: {
        fontSize: typography.xs,
        lineHeight: verticalScale(18),
      },
      finishPremiumButton: {
        marginTop: spacing.xs,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
      },
      finishPremiumButtonText: {
        fontSize: typography.small,
        fontFamily: fonts.headingBold,
        includeFontPadding: false,
        lineHeight: verticalScale(18),
      },
      finishPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: radii.md,
        paddingVertical: spacing.sm,
        marginTop: spacing.xs,
      },
      finishPrimaryButtonText: {
        fontSize: typography.body,
        fontFamily: fonts.headingBold,
        includeFontPadding: false,
        lineHeight: verticalScale(22),
      },
      finishSecondaryButton: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
      },
      finishSecondaryButtonText: {
        fontSize: typography.small,
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
    }),
  };
};
