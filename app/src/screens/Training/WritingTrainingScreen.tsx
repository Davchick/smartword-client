import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, X as XIcon, ArrowLeftRight } from 'lucide-react-native';
import { useWords } from '../../hooks/useWords';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
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
  const { groupId, groupName } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { words, loading, updateWordProgress, getTrainingWords } = useWords(groupId);

  const [trainingWords, setTrainingWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [direction, setDirection] = useState<Direction>('foreign');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  const feedbackScale = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const initTraining = useCallback(() => {
    const tw = getTrainingWords();
    setTrainingWords(tw);
    setCurrentIndex(0);
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    setSessionCorrect(0);
    setSessionTotal(0);
    progressWidth.setValue(0);
  }, [getTrainingWords, progressWidth]);

  useEffect(() => {
    if (!loading && words.length > 0) initTraining();
  }, [loading, words, initTraining]);

  useEffect(() => {
    if (trainingWords.length === 0) return;
    Animated.timing(progressWidth, {
      toValue: (currentIndex + 1) / trainingWords.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, trainingWords.length, progressWidth]);

  const animateFeedback = (correct: boolean) => {
    feedbackScale.setValue(0.5);
    feedbackOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(feedbackScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    if (!correct) {
      shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
  };

  if (loading) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (words.length === 0 || trainingWords.length === 0) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 8, left: spacing.md }]}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет слов для тренировки</Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          Добавьте слова в словарь, чтобы начать.
        </Text>
      </View>
    );
  }

  const currentWord = trainingWords[currentIndex];
  const promptText = direction === 'foreign' ? currentWord.translation : currentWord.original;
  const answerText = direction === 'foreign' ? currentWord.original : currentWord.translation;
  const promptLabel = direction === 'foreign' ? 'Слово на русском' : 'Слово на иностранном';
  const inputPlaceholder = direction === 'foreign' ? 'Введите перевод...' : 'Введите по-русски...';

  const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

  const handleCheck = async () => {
    if (!input.trim()) return;
    const success = checkAnswer(input, answerText);
    setChecked(true);
    setIsCorrect(success);
    setSessionTotal((t) => t + 1);
    if (success) setSessionCorrect((c) => c + 1);
    animateFeedback(success);
    if (direction === 'foreign') {
      await updateWordProgress(currentWord.id, success);
    }
  };

  const handleNext = () => {
    const next = currentIndex + 1;
    if (next >= trainingWords.length) {
      setTrainingWords(getTrainingWords());
      setCurrentIndex(0);
    } else {
      setCurrentIndex(next);
    }
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    feedbackOpacity.setValue(0);
    feedbackScale.setValue(0);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSwap = () => {
    setDirection((d) => (d === 'foreign' ? 'native' : 'foreign'));
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    feedbackOpacity.setValue(0);
  };

  const cardBorderColor = checked ? (isCorrect ? colors.success : colors.danger) : colors.border;
  const inputBorderColor = checked ? (isCorrect ? colors.success : colors.danger) : colors.border;

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
            {currentIndex + 1} / {trainingWords.length}
            {sessionTotal > 0 ? `  ·  ${accuracy}%` : ''}
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

      {/* Direction badge */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {direction === 'foreign' ? 'RU → Иностранный' : 'Иностранный → RU'}
          </Text>
        </View>
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
          <Text style={[styles.promptLabel, { color: colors.muted }]}>{promptLabel}</Text>
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
          onChangeText={checked ? undefined : setInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={checked ? 'next' : 'done'}
          onSubmitEditing={checked ? handleNext : handleCheck}
          editable={!checked}
          autoFocus
        />

        {/* Feedback chip */}
        {checked && (
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

        {/* CTA button */}
        {!checked ? (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }, !input.trim() && { opacity: 0.4 }]}
            onPress={handleCheck}
            disabled={!input.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Проверить</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              {currentIndex + 1 >= trainingWords.length ? 'Заново' : 'Следующее →'}
            </Text>
          </TouchableOpacity>
        )}

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
              <Text style={[styles.statVal, { color: colors.primary }]}>{accuracy}%</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>точность</Text>
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
  badgeRow: { alignItems: 'center', marginTop: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full },
  badgeText: { fontSize: typography.small, fontFamily: fonts.medium },
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
  promptLabel: { fontSize: typography.small },
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
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ctaText: { fontSize: typography.body, fontFamily: fonts.bold, color: '#000' },
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
});
