import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, radii, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.12;

interface Props {
  word: { original: string; translation: string };
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  stackIndex: number; // 0 = top, 1 = middle, 2 = bottom
}

const triggerHapticMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

const triggerHapticLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const SwipeCard = ({ word, onSwipeRight, onSwipeLeft, isTop, stackIndex }: Props) => {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const hapticTriggered = useSharedValue(false);

  // Flip state: 0 = front (original), 1 = back (translation) in degrees 0→180
  const flipRotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);

  // Важно: при циклическом переиспользовании карточек (когда слов мало)
  // одна и та же карточка может снова стать верхней без размонтирования.
  // Тогда нужно сбросить анимационные значения, иначе жесты могут “умирать”.
  useEffect(() => {
    if (!isTop) return;
    translateX.value = 0;
    translateY.value = 0;
    hapticTriggered.value = false;
    flipRotation.value = 0;
    isFlipped.value = false;
  }, [isTop, word.original, word.translation, flipRotation, hapticTriggered, isFlipped, translateX, translateY]);

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .onEnd(() => {
      if (!isFlipped.value) {
        // Flip to show translation
        flipRotation.value = withTiming(180, { duration: 350 });
        isFlipped.value = true;
        runOnJS(triggerHapticLight)();
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY / 6;

      if (Math.abs(event.translationX) > SWIPE_THRESHOLD && !hapticTriggered.value) {
        hapticTriggered.value = true;
        runOnJS(triggerHapticMedium)();
      }
      if (Math.abs(event.translationX) <= SWIPE_THRESHOLD) {
        hapticTriggered.value = false;
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, {
          velocity: event.velocityX,
          damping: 20,
        });
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {
          velocity: event.velocityX,
          damping: 20,
        });
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        hapticTriggered.value = false;
      }
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const scale = 1 - stackIndex * 0.03;
  const yOffset = stackIndex * 8;

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: isTop ? translateX.value : 0 },
        { translateY: isTop ? translateY.value + yOffset : yOffset },
        { rotate: `${isTop ? rotate : 0}deg` },
        { scale },
      ],
      zIndex: 10 - stackIndex,
    };
  });

  // Front face (original) — visible when flipRotation 0..89
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flipRotation.value < 90 ? 1 : 0,
    transform: [{ rotateY: `${flipRotation.value}deg` }],
    backfaceVisibility: 'hidden',
  }));

  // Back face (translation) — visible when flipRotation 90..180
  const backStyle = useAnimatedStyle(() => ({
    opacity: flipRotation.value >= 90 ? 1 : 0,
    transform: [{ rotateY: `${flipRotation.value - 180}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const knowOverlayStyle = useAnimatedStyle(() => ({
    opacity: isTop
      ? interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
      : 0,
  }));

  const dontKnowOverlayStyle = useAnimatedStyle(() => ({
    opacity: isTop
      ? interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP)
      : 0,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        animatedStyle,
      ]}>
        {/* Оверлей "ЗНАЮ" */}
        <Animated.View style={[styles.overlay, { right: spacing.lg, borderColor: colors.success, backgroundColor: 'rgba(52, 211, 153, 0.1)' }, knowOverlayStyle]}>
          <Text style={[styles.overlayText, { color: colors.success }]}>ЗНАЮ</Text>
        </Animated.View>

        {/* Оверлей "НЕ ЗНАЮ" */}
        <Animated.View style={[styles.overlay, { left: spacing.lg, borderColor: colors.danger, backgroundColor: 'rgba(251, 113, 133, 0.1)' }, dontKnowOverlayStyle]}>
          <Text style={[styles.overlayText, { color: colors.danger }]}>НЕ ЗНАЮ</Text>
        </Animated.View>

        {/* Лицевая сторона — слово */}
        <Animated.View style={[styles.cardFace, frontStyle]}>
          <Text style={[styles.originalText, { color: colors.text }]}>{word.original}</Text>
          {isTop && (
            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: colors.muted }]}>Нажмите, чтобы увидеть перевод</Text>
            </View>
          )}
        </Animated.View>

        {/* Обратная сторона — перевод */}
        <Animated.View style={[styles.cardFace, backStyle]}>
          <Text style={[styles.originalText, { color: colors.text }]}>{word.original}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.translationText, { color: colors.primary }]}>{word.translation}</Text>
          {isTop && (
            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: colors.muted }]}>← не знаю · знаю →</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - spacing.lg * 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    alignSelf: 'center',
    minHeight: 280,
    justifyContent: 'center',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  originalText: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
  },
  translationText: {
    fontSize: typography.subtitle,
    textAlign: 'center',
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: spacing.lg,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 2,
    zIndex: 20,
  },
  overlayText: {
    fontSize: typography.small,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tapHint: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: typography.small,
  },
});
