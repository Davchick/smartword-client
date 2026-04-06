import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Dumbbell, Crown } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { SwipeCard } from '../../components/SwipeCard';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useProfile } from '../../hooks/useProfile';
import { useTrainingProgress } from '../../hooks/useTrainingProgress';
import { PaywallModal } from '../../components/PaywallModal';
import type { TrainingScreenProps, TabTrainingScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

type Props = TrainingScreenProps | TabTrainingScreenProps;

const CARDS_VISIBLE = 3;

type Round = 'initial' | 'retry';

const WEEKLY_LIMIT_KEY = '@SmartWord:weeklyLimitReached';
const WEEKLY_LEARNED_KEY = '@SmartWord:wordsLearnedThisWeek';

export const TrainingScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const params = 'params' in route ? route.params : undefined;
  const groupId = params && 'groupId' in params ? params.groupId : undefined;
  const groupName = params && 'groupName' in params ? params.groupName : 'Все слова';
  const insets = useSafeAreaInsets();

  const { words, loading, updateWordProgress, getTrainingWords, refetch: refetchWords } = useWords(groupId);
  const { profile, refetch: refetchProfile } = useProfile();
  const { addPoints } = useTrainingProgress();
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
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false);
  const [wordsLearnedThisWeek, setWordsLearnedThisWeek] = useState<number>(0);
  const weeklyLimit = 50; // слов в неделю для бесплатных пользователей
  const [isProcessing, setIsProcessing] = useState(false); // Блокировка спама кнопок
  const [wordsLearnedInSession, setWordsLearnedInSession] = useState(0); // Сколько слов выучили в ЭТОЙ сессии

  // Загружаем сохранённые значения из AsyncStorage при монтировании
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const [limitReached, learned] = await Promise.all([
          AsyncStorage.getItem(WEEKLY_LIMIT_KEY),
          AsyncStorage.getItem(WEEKLY_LEARNED_KEY),
        ]);
        if (limitReached !== null) {
          setWeeklyLimitReached(JSON.parse(limitReached));
        }
        if (learned !== null) {
          setWordsLearnedThisWeek(JSON.parse(learned));
        }
      } catch (e) {
        console.warn('[Training] Failed to load saved state:', e);
      }
    };
    loadSavedState();
  }, []);

  // Сохраняем weeklyLimitReached в AsyncStorage при изменении
  useEffect(() => {
    AsyncStorage.setItem(WEEKLY_LIMIT_KEY, JSON.stringify(weeklyLimitReached)).catch(e =>
      console.warn('[Training] Failed to save weeklyLimitReached:', e)
    );
  }, [weeklyLimitReached]);

  // Сохраняем wordsLearnedThisWeek в AsyncStorage при изменении
  useEffect(() => {
    AsyncStorage.setItem(WEEKLY_LEARNED_KEY, JSON.stringify(wordsLearnedThisWeek)).catch(e =>
      console.warn('[Training] Failed to save wordsLearnedThisWeek:', e)
    );
  }, [wordsLearnedThisWeek]);

  // Сбрасываем сохранённые значения в начале новой недели (понедельник)
  useEffect(() => {
    const checkWeekReset = async () => {
      try {
        const now = new Date();
        const currentMonday = new Date(now);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);
        currentMonday.setHours(0, 0, 0, 0);

        const savedMonday = await AsyncStorage.getItem('@SmartWord:lastMonday');
        if (savedMonday === null || new Date(savedMonday) < currentMonday) {
          // Новая неделя — сбрасываем
          await AsyncStorage.setItem('@SmartWord:lastMonday', currentMonday.toISOString());
          await AsyncStorage.setItem(WEEKLY_LIMIT_KEY, 'false');
          await AsyncStorage.setItem(WEEKLY_LEARNED_KEY, '0');
          setWeeklyLimitReached(false);
          setWordsLearnedThisWeek(0);
          console.log('[Training] Week reset - new Monday:', currentMonday);
        }
      } catch (e) {
        console.warn('[Training] Week reset error:', e);
      }
    };
    checkWeekReset();
  }, []);

  // Проверяем лимит при загрузке тренировки (блокируем следующие сессии)
  useEffect(() => {
    console.log('[Training] useEffect check:', {
      loading,
      wordsLength: words.length,
      weeklyLimitReached,
      profileIsPremium: profile?.is_premium,
      profileWordsLearned: profile?.words_learned_this_week,
      wordsLearnedThisWeek,
      weeklyLimit,
    });

    // Если уже заблокировано - не продолжаем
    if (weeklyLimitReached) {
      console.log('[Training] Already blocked, skipping');
      return;
    }

    if (!loading && words.length > 0) {
      // Используем wordsLearnedThisWeek (сохраняется между рендерами) + profile
      const currentLearned = (profile?.words_learned_this_week ?? 0) + wordsLearnedThisWeek;
      console.log('[Training] Checking limit:', { currentLearned, weeklyLimit, isPremium: profile?.is_premium, wordsLearnedThisWeek });

      if (currentLearned >= weeklyLimit && !profile?.is_premium) {
        console.log('[Training] 🔒 LIMIT REACHED - blocking session');
        setWeeklyLimitReached(true);
        setWordsLearnedThisWeek(currentLearned);
        return;
      }

      const tw = getTrainingWords();
      console.log('[Training] Starting session:', { trainingWords: tw.length });
      setTrainingWords(tw);
      setInitialTotal(tw.length);
      setCurrentIndex(0);
      setStats({ knew: 0, didntKnow: 0 });
      setFinished(false);
      setRound('initial');
      initialWrongIdsRef.current = new Set();
      retryTotalRef.current = 0;
    }
  }, [loading, profile, weeklyLimitReached, words.length, wordsLearnedThisWeek]);

  const formatScore = (value: number) => {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  };

  const handleSwipe = async (knew: boolean) => {
    // Игнорируем нажатия если уже обрабатываем предыдущее
    if (isProcessing) return;

    // Блокируем свайпы если достигнут лимит
    if (weeklyLimitReached && !profile?.is_premium) {
      console.log('[Training] 🚫 Swipe blocked - weekly limit reached');
      return;
    }

    const currentWord = trainingWords[currentIndex];
    if (!currentWord) return;

    setIsProcessing(true);

    try {
      if (round === 'retry') {
        if (knew) {
          await updateWordProgress(currentWord.id, true, { correctDelta: 0.5 });
          // Начисляем 0.5 очков за слово, угаданное со второй попытки
          await addPoints(0.5);
        } else {
          // На повторении ошибок не "штрафуем" прогрессом за повторный промах —
          // просто отправляем слово в конец очереди.
          await updateWordProgress(currentWord.id, false, { incorrectDelta: 0 });
        }
      } else {
        const result = await updateWordProgress(currentWord.id, knew);

        // Считаем сколько слов выучили в этой сессии (correct_count стал >= 5)
        const wasLearnedBefore = currentWord.correct_count >= 5;
        const isNowLearned = knew && (currentWord.correct_count + 1) >= 5;
        const justLearned = !wasLearnedBefore && isNowLearned;

        if (justLearned && knew) {
          // Обновляем оба счётчика
          setWordsLearnedInSession((prev) => {
            const newVal = prev + 1;
            console.log('[Training] 📚 Word learned in session:', { wordId: currentWord.id, sessionCount: newVal });
            return newVal;
          });
          setWordsLearnedThisWeek((prev) => {
            const newVal = prev + 1;
            console.log('[Training] 📚 Word learned this week:', { wordId: currentWord.id, weekCount: newVal });
            return newVal;
          });
        }

        // Логируем прогресс
        console.log('[Training] 📊 Swipe:', {
          wordId: currentWord.id,
          knew,
          oldCorrectCount: currentWord.correct_count,
          newCorrectCount: result.newCorrectCount,
          justLearned,
          wordsLearnedInSession,
          result,
        });

        // Начисляем 1 очко за слово, угаданное с первой попытки
        if (knew) {
          await addPoints(1);
        }
      }

      if (round === 'initial') {
        setStats((prev) => ({
          knew: knew ? prev.knew + 1 : prev.knew,
          didntKnow: !knew ? prev.didntKnow + 1 : prev.didntKnow,
        }));
        if (!knew) initialWrongIdsRef.current.add(currentWord.id);
      } else {
        // Во втором круге "не знаю" не штрафуем в отчёте,
        // а за "знаю" после ошибки в первом круге даём 0.5.
        if (knew) {
          setStats((prev) => ({ ...prev, knew: prev.knew + 0.5 }));
        }
      }

      if (round === 'retry') {
        // Очередь повторения: вправо = убрать слово, влево = в конец.
        setTrainingWords((prev) => {
          if (prev.length === 0) return prev;
          const head = prev[0]!;
          const tail = prev.slice(1);
          const nextQueue = knew ? tail : [...tail, head];
          if (nextQueue.length === 0) setFinished(true);
          return nextQueue;
        });
        setCurrentIndex(0);
        setIsProcessing(false);
        return;
      }

      // Первый круг — линейно идём по списку, и в конце запускаем повтор ошибок.
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
  };

  const handleRestart = () => {
    // Не позволяем перезапустить если лимит достигнут
    const currentLearned = (profile?.words_learned_this_week ?? 0) + wordsLearnedThisWeek;
    if (currentLearned >= weeklyLimit && !profile?.is_premium) {
      console.log('[Training] 🚫 Restart blocked - weekly limit reached');
      setWeeklyLimitReached(true);
      return;
    }

    const tw = getTrainingWords();
    setTrainingWords(tw);
    setInitialTotal(tw.length);
    setCurrentIndex(0);
    setStats({ knew: 0, didntKnow: 0 });
    setFinished(false);
    setRound('initial');
    initialWrongIdsRef.current = new Set();
    retryTotalRef.current = 0;
    setWordsLearnedInSession(0); // Сбрасываем счётчик сессии
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
            onPress={() => {
              navigation.goBack();
            }}
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

  if (finished) {
    const total = initialTotal;
    const percent = total > 0 ? Math.round((stats.knew / total) * 100) : 0;

    // Проверяем, остались ли слова для тренировки
    const remainingWords = getTrainingWords();
    const allWordsArchived = remainingWords.length === 0;

    // Проверяем, достигли ли лимита на этой неделе (мягкий лимит - блокируем только СЛЕДУЮЩИЕ сессии)
    const currentLearned = profile?.words_learned_this_week ?? 0;
    const totalLearnedAfterSession = currentLearned + wordsLearnedThisWeek;
    const hitLimitThisSession = totalLearnedAfterSession >= weeklyLimit && currentLearned < weeklyLimit;
    const alreadyHitLimitBeforeSession = currentLearned >= weeklyLimit;

    console.log('[Training] Finished check:', {
      currentLearned,
      wordsLearnedThisWeek,
      totalLearnedAfterSession,
      weeklyLimit,
      hitLimitThisSession,
      alreadyHitLimitBeforeSession,
      isPremium: profile?.is_premium,
    });

    // Если лимит был достигнут ДО этой сессии или в конце сессии — показываем блокировку
    if ((!profile?.is_premium && alreadyHitLimitBeforeSession) || hitLimitThisSession) {
      console.log('[Training] 🔒 Showing limit screen');

      // Обновляем состояние без refetch (чтобы избежать бесконечного цикла ререндеров)
      setWeeklyLimitReached(true);

      return (
        <View style={[styles.container, styles.center, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.resultEmoji}>🔒</Text>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Лимит на этой неделе исчерпан</Text>
            <Text style={[styles.resultSubtitle, { color: colors.muted }]}>
              Вы выучили {Math.min(totalLearnedAfterSession, weeklyLimit)} из {weeklyLimit} слов
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
              onPress={() => {
                navigation.goBack();
              }}
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
            // Все слова выучены — показываем сообщение и кнопку "Назад к словарю"
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
            // Лимит достигнут — показываем сообщение
            <View style={[styles.successCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Text style={[styles.successTitle, { color: colors.muted }]}>
                🔒 Лимит на этой неделе исчерпан
              </Text>
              <Text style={[styles.successText, { color: colors.muted }]}>
                Вы выучили {weeklyLimit} слов. Возвращайтесь в понедельник для продолжения тренировок!
              </Text>
            </View>
          ) : (
            // Есть слова для тренировки — показываем кнопку "Ещё раз"
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
            onPress={() => {
              navigation.goBack();
            }}
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
        {/* Название строго по центру экрана */}
        <View style={styles.headerTitlesAbsolute} pointerEvents="none">
          <Text style={[styles.headerTitle, { color: colors.text }]}>{groupName}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {round === 'retry'
              ? `Повторение ${currentIndex + 1}/${trainingWords.length}`
              : `${currentIndex + 1} / ${trainingWords.length}`}
          </Text>
        </View>
        {/* Счётчики по краям */}
        <Text style={[styles.counterLeft, { color: colors.danger }]}>{stats.didntKnow}</Text>
        <View style={styles.headerSpacer} />
        <Text style={[styles.counterRight, { color: colors.success }]}>{formatScore(stats.knew)}</Text>
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
              disabled={isProcessing}
            />
          );
        })}
      </View>

      {/* Кнопки-подсказки */}
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
