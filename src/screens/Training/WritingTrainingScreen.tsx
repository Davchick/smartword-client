import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  BackHandler,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, X as XIcon, ArrowLeftRight, Lightbulb, RotateCcw, Crown } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
import { useTrainingSession } from '../../hooks/useTrainingSession';
import { useProfile } from '../../hooks/useProfile';
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit';
import { PaywallModal } from '../../components/PaywallModal';
import { SkeletonScreen } from '../../components/ui/SkeletonScreen';
import { ARCHIVE_THRESHOLD } from '../../constants';
import type { TrainingWriteScreenProps } from '../../navigation/types';
import type { Word } from '../../hooks/useWords';

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:'"()\-–—«»]/g, '')
    .replace(/\s+/g, ' ');
}

function checkAnswer(userInput: string, correct: string): boolean {
  const userNorm = normalize(userInput);
  if (!userNorm) return false;
  const variants = correct.split(/[/,|]/).map((v) => normalize(v));
  return variants.some((v) => v === userNorm);
}

type Direction = 'foreign' | 'native';

export const WritingTrainingScreen = ({ route, navigation }: TrainingWriteScreenProps) => {
  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName ?? 'Все слова';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { words, loading, updateWordProgress, getTrainingWords } = useWords(groupId);
  const { profile } = useProfile();
  const { startSession, recordWord, flushSession } = useTrainingSession();
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
  const [totalWords, setTotalWords] = useState(0); // Общее кол-во слов для прогресса
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [direction, setDirection] = useState<Direction>('foreign');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [sessionHints, setSessionHints] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [wordsLearnedInSession, setWordsLearnedInSession] = useState(0);

  // Отслеживаем достижение лимита во время сессии
  const [hitLimitThisSession, setHitLimitThisSession] = useState(false);

  const feedbackScale = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const trainingWordsRef = useRef<Word[]>([]);
  const initializedRef = useRef(false);

  /**
   * Перемешивает массив (Fisher-Yates shuffle).
   */
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }, []);

  // Отслеживаем достижение лимита во время сессии
  useEffect(() => {
    if (finished && !profile?.is_premium) {
      setHitLimitThisSession(checkLimit());
    }
  }, [finished, profile?.is_premium, checkLimit]);

  const initTraining = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const tw = getTrainingWords();
    const shuffled = shuffleArray(tw);
    trainingWordsRef.current = shuffled;
    setTrainingWords(shuffled);
    setTotalWords(shuffled.length);
    setCurrentIndex(0);
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    setSessionCorrect(0);
    setSessionTotal(0);
    setFinished(false);
    setHintCount(0);
    setSessionHints(0);
    setSkipped(false);
    progressWidth.setValue(0);
    startSession(groupId, groupName);
  }, [getTrainingWords, groupId, groupName, startSession, progressWidth, shuffleArray]);

  // Проверяем лимит при загрузке тренировки и инициализируем
  useEffect(() => {
    if (weeklyLimitReached || loading || words.length === 0) {
      // Если слова пропали (ушли с экрана) — сбрасываем флаг
      if (words.length === 0) {
        initializedRef.current = false;
      }
      return;
    }

    if (checkLimit()) {
      return;
    }

    initTraining();
  }, [loading, words.length, weeklyLimitReached, checkLimit, initTraining]);

  // Обновляем прогресс-бар на основе завершённых слов
  useEffect(() => {
    if (totalWords === 0) return;
    const completed = totalWords - trainingWords.length;
    Animated.timing(progressWidth, {
      toValue: completed / totalWords,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [trainingWords.length, totalWords, progressWidth]);

  // Flush сессии при выходе из тренировки + hardware back button handler
  useFocusEffect(
    useCallback(() => {
      // Hardware back button → goBack (к TrainingModes)
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true; // перехватили
      });

      return () => {
        void flushSession();
        backHandler.remove();
      };
    }, [flushSession, navigation])
  );

  // Cleanup: отменяем все pending таймеры при unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  // Безопасный setTimeout — автоматически трекает и очищает при unmount
  const safeTimeout = useCallback((fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      fn();
    }, ms);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const handleRestart = useCallback(() => {
    initializedRef.current = false;
    resetLocal();
    initTraining();
  }, [initTraining, resetLocal]);

  const animateFeedback = (correct: boolean) => {
    feedbackScale.setValue(0.5);
    feedbackOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(feedbackScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 12 }),
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    if (!correct) {
      shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  };

  const currentWord = trainingWords[currentIndex] ?? null;
  const promptText = currentWord ? (direction === 'foreign' ? currentWord.translation : currentWord.original) : '';
  const answerText = currentWord ? (direction === 'foreign' ? currentWord.original : currentWord.translation) : '';
  const inputPlaceholder = 'Введите перевод';
  const primaryAnswer = answerText ? (answerText.split(/[/,|]/)[0]?.trim() ?? '') : '';

  const goToNextWord = useCallback(() => {
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    setHintCount(0);
    feedbackOpacity.setValue(0);
    feedbackScale.setValue(0);
    setSkipped(false);

    // Убираем текущее слово из массива — оно больше не появится
    const remaining = trainingWordsRef.current.filter((_, idx) => idx !== currentIndex);

    if (remaining.length === 0) {
      setFinished(true);
      trainingWordsRef.current = [];
      setTrainingWords([]);
    } else {
      trainingWordsRef.current = remaining;
      setTrainingWords(remaining);
      // currentIndex остаётся 0 — всегда берём первый элемент из оставшихся
    }

    safeTimeout(() => inputRef.current?.focus(), 80);
  }, [currentIndex, feedbackOpacity, feedbackScale, safeTimeout]);

  const handleInputChange = useCallback((text: string) => {
    if (checked || !currentWord) return;
    setInput(text);
    if (!text.trim()) return;
    if (checkAnswer(text, answerText)) {
      setSkipped(false);
      setChecked(true);
      setIsCorrect(true);
      setSessionTotal((t) => t + 1);
      setSessionCorrect((c) => c + 1);
      animateFeedback(true);

      // Обновляем локально (optimistic), без сети — данные уйдут при flush
      updateWordProgress(currentWord.id, true, { correctDelta: 1, incorrectDelta: 0, offline: true }).catch(() => {
        // Не критично — локальное состояние уже обновлено
      });

      // Проверяем, выучено ли слово (correct_count стал >= ARCHIVE_THRESHOLD)
      const wasLearnedBefore = currentWord.correct_count >= ARCHIVE_THRESHOLD;
      const isNowLearned = (currentWord.correct_count + 1) >= ARCHIVE_THRESHOLD;
      const justLearned = !wasLearnedBefore && isNowLearned;

      if (justLearned) {
        setWordsLearnedInSession((prev) => prev + 1);
        incrementAndCheck(1);
      }

      // Записываем в сессию (для последующего batch flush)
      const points = hintCount > 0 ? 0.5 : 1;
      recordWord(currentWord.id, true, { correctDelta: 1, incorrectDelta: 0, points });
      safeTimeout(() => {
        goToNextWord();
      }, 900);
    }
  }, [checked, currentWord, answerText, animateFeedback, updateWordProgress, ARCHIVE_THRESHOLD, hintCount, recordWord, safeTimeout, goToNextWord, incrementAndCheck]);

  const handleHint = useCallback(() => {
    if (checked || !currentWord) return;
    if (!primaryAnswer) return;
    if (hintCount >= primaryAnswer.length) return;

    setSkipped(false);
    setSessionHints((h) => h + 1);

    const nextCount = Math.min(primaryAnswer.length, hintCount + 1);
    setHintCount(nextCount);
    const newInput = primaryAnswer.slice(0, nextCount);
    setInput(newInput);

    if (nextCount >= primaryAnswer.length) {
      // Полностью раскрыли слово подсказками — считаем попытку без очков
      setSkipped(true);
      setChecked(true);
      setIsCorrect(false);
      setSessionTotal((t) => t + 1);
      animateFeedback(false);

      // Обновляем прогресс слова локально
      updateWordProgress(currentWord.id, false, { correctDelta: 0, incorrectDelta: 1, offline: true }).catch(() => {});

      // Записываем в сессию — 0 очков за полное использование подсказок
      recordWord(currentWord.id, false, { correctDelta: 0, incorrectDelta: 1, points: 0 });

      safeTimeout(() => {
        goToNextWord();
      }, 1300);
    }
  }, [checked, currentWord, primaryAnswer, hintCount, animateFeedback, updateWordProgress, recordWord, safeTimeout, goToNextWord]);

  const handleDontRemember = useCallback(() => {
    if (checked || !currentWord) return;
    setSkipped(true);
    setChecked(true);
    setIsCorrect(false);
    setSessionTotal((t) => t + 1);
    animateFeedback(false);

    // Обновляем прогресс слова локально
    updateWordProgress(currentWord.id, false, { correctDelta: 0, incorrectDelta: 1, offline: true }).catch(() => {});

    // Записываем в сессию — 0 очков за неправильный ответ
    recordWord(currentWord.id, false, { correctDelta: 0, incorrectDelta: 1, points: 0 });

    safeTimeout(() => {
      goToNextWord();
    }, 1600);
  }, [checked, currentWord, animateFeedback, updateWordProgress, recordWord, safeTimeout, goToNextWord]);

  const handleSwap = useCallback(() => {
    setDirection((d) => (d === 'foreign' ? 'native' : 'foreign'));
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    setHintCount(0);
    feedbackOpacity.setValue(0);
    setSkipped(false);
  }, []);

  const cardBorderColor = skipped
    ? colors.primary
    : checked
    ? isCorrect
      ? colors.success
      : colors.danger
    : colors.border;
  const inputBorderColor = skipped
    ? colors.border
    : checked
    ? isCorrect
      ? colors.success
      : colors.danger
    : colors.border;

  if (loading) {
    return <SkeletonScreen type="training" showHeader={false} />;
  }

  if (words.length === 0 || trainingWords.length === 0) {
    const allArchived = words.length > 0 && trainingWords.length === 0;
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 8, left: spacing.md }]}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {allArchived ? 'Все слова выучены' : 'Нет слов для тренировки'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          {allArchived
            ? 'В этой группе все слова уже хорошо освоены. Выберите другую группу или добавьте новые слова.'
            : 'Добавьте слова в словарь, чтобы начать.'}
        </Text>
      </View>
    );
  }

  // Экран блокировки (лимит достигнут)
  if (weeklyLimitReached && !profile?.is_premium) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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

  if (finished) {
    const total = sessionTotal;
    const percent = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;

    if (hitLimitThisSession && !profile?.is_premium) {
      return (
        <View style={[styles.fill, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { top: insets.top + 8, left: spacing.md }]}
        >
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>

        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={styles.resultEmoji}>{percent >= 80 ? '🎉' : percent >= 50 ? '💪' : '📚'}</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Тренировка завершена!</Text>
          <Text style={[styles.resultSubtitle, { color: colors.muted }]}>{groupName}</Text>

          <View style={[styles.statsRow, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.success }]}>{sessionCorrect}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>верно</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.danger }]}>{sessionTotal - sessionCorrect}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>ошибок</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{sessionHints}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>подсказок</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.resultCta, { backgroundColor: colors.primary, marginTop: spacing.lg }]}
            onPress={handleRestart}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <RotateCcw color="#000" size={18} />
              <Text style={styles.ctaText}>Повторить игру</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentWord) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{groupName}</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {totalWords - trainingWords.length + 1} / {totalWords}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSwap}
          style={[styles.swapBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <ArrowLeftRight color={colors.primary} size={15} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.elevated }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: cardBorderColor, borderWidth: checked ? 2 : 1 },
            { transform: [{ translateX: shakeX }] },
          ]}
        >
          <Text style={[styles.promptWord, { color: colors.text }]}>{promptText}</Text>

          {checked && !isCorrect && (
            <Animated.View
              style={[
                styles.correctBlock,
                { borderTopColor: colors.border },
                { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] },
              ]}
            >
              <Text style={[styles.correctLabel, { color: colors.muted }]}>Правильный ответ</Text>
              <Text style={[styles.correctValue, { color: colors.primary }]}>{answerText}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: inputBorderColor,
              color: colors.text,
              borderWidth: checked ? 2 : 1,
            },
          ]}
          placeholder={inputPlaceholder}
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={checked ? undefined : handleInputChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          editable={!checked}
          autoFocus
        />

        {/* Feedback chip */}
        {checked && !skipped && (
          <Animated.View
            style={[styles.feedbackWrap, { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] }]}
          >
            {isCorrect ? (
              <View style={[styles.chip, { backgroundColor: `${colors.success}22` }]}>
                <Check color={colors.success} size={16} strokeWidth={2.5} />
                <Text style={[styles.chipText, { color: colors.success }]}>Верно!</Text>
              </View>
            ) : (
              <View style={[styles.chip, { backgroundColor: `${colors.danger}22` }]}>
                <XIcon color={colors.danger} size={16} strokeWidth={2.5} />
                <Text style={[styles.chipText, { color: colors.danger }]}>Ошибка</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Actions: hint + don't remember */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }, checked && { opacity: 0.4 }]}
            onPress={handleDontRemember}
            disabled={checked}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Не помню</Text>
          </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.hintIconBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.elevated,
            },
            (checked || !primaryAnswer || hintCount >= primaryAnswer.length) && { opacity: 0.4 },
          ]}
          onPress={handleHint}
          disabled={checked || !primaryAnswer || hintCount >= primaryAnswer.length}
          activeOpacity={0.85}
        >
          <Lightbulb color={colors.text} size={18} />
        </TouchableOpacity>
        </View>

        {/* Session stats */}
        {sessionTotal > 0 && (
          <View style={[styles.statsRow, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.success }]}>{sessionCorrect}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>верно</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.danger }]}>{sessionTotal - sessionCorrect}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>ошибок</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{sessionHints}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>подсказок</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconBtn: { padding: spacing.xs },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: typography.body, fontFamily: fonts.headingBold },
  headerSub: { fontSize: typography.small, marginTop: 1 },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 3, marginHorizontal: spacing.md, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 110,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  promptWord: { fontSize: 28, fontFamily: fonts.headingBold, lineHeight: 38 },
  correctBlock: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, gap: 4 },
  correctLabel: { fontSize: typography.xs },
  correctValue: { fontSize: typography.subtitle, fontFamily: fonts.bold },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    fontSize: typography.subtitle,
    fontFamily: fonts.regular,
  },
  feedbackWrap: { alignItems: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  chipText: { fontSize: typography.small, fontFamily: fonts.bold },
  cta: {
    flex: 1,
    borderRadius: radii.md,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: typography.body, fontFamily: fonts.bold, color: '#000' },
  resultCta: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: 2 },
  statDiv: { width: 1 },
  statVal: { fontSize: typography.subtitle, fontFamily: fonts.headingBold },
  statLbl: { fontSize: typography.xs },
  backBtn: { position: 'absolute', zIndex: 10, padding: spacing.xs },
  emptyTitle: { fontSize: typography.subtitle, fontFamily: fonts.headingBold, textAlign: 'center', marginTop: 60 },
  emptySubtitle: { fontSize: typography.body, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hintIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    fontSize: 48,
  },
  resultTitle: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: typography.small,
    textAlign: 'center',
  },
  limitCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    width: '100%',
  },
  limitText: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  limitSubText: {
    fontSize: typography.small,
    textAlign: 'center',
    marginTop: 4,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    width: '100%',
  },
  premiumButtonText: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
    flex: 1,
  },
  backToGroupButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backToGroupText: {
    fontSize: typography.small,
    textAlign: 'center',
  },
});
