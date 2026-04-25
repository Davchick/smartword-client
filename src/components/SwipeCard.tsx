import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, radii, typography } from '../theme';

export type SwipeCardHandle = {
  swipe: (direction: 'left' | 'right') => void;
};

interface Props {
  word: { original: string; translation: string };
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  stackIndex: number;
  disabled?: boolean; // blocks swipe callbacks / progress updates
  gesturesDisabled?: boolean; // blocks user gestures only (buttons may still trigger programmatic swipe)
  frontSide?: 'original' | 'translation';
  onDragActiveChange?: (active: boolean) => void;
  hidden?: boolean;
}

const triggerHapticMedium = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

const triggerHapticLight = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(({
  word,
  onSwipeRight,
  onSwipeLeft,
  isTop,
  stackIndex,
  disabled = false,
  gesturesDisabled = false,
  frontSide = 'original',
  onDragActiveChange,
  hidden = false,
}, ref) => {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const SWIPE_THRESHOLD = windowWidth * 0.12;
  const safeOriginal = word?.original ?? '';
  const safeTranslation = word?.translation ?? '';
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const hapticTriggered = useSharedValue(false);
  const enterScale = useSharedValue(1);
  const enterOpacity = useSharedValue(1);
  const enterTranslateY = useSharedValue(0);
  const prevIsTopRef = useRef(isTop);
  const mountedRef = useRef(false);
  const programmaticInFlightRef = useRef(false);

  const endProgrammaticSwipe = () => {
    programmaticInFlightRef.current = false;
    onDragActiveChange?.(false);
  };

  // Flip state: 0 = front (original), 1 = back (translation) in degrees 0→180
  const flipRotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);

  // Shared value для windowWidth — используется в worklet
  const swRef = useSharedValue(windowWidth);

  // Важно: при циклическом переиспользовании карточек (когда слов мало)
  // одна и та же карточка может снова стать верхней без размонтирования.
  // Тогда нужно сбросить анимационные значения, иначе жесты могут "умирать".
  useEffect(() => {
    if (!isTop) return;
    translateX.value = 0;
    translateY.value = 0;
    hapticTriggered.value = false;
    flipRotation.value = 0;
    isFlipped.value = false;
  }, [isTop, safeOriginal, safeTranslation, flipRotation, hapticTriggered, isFlipped, translateX, translateY]);

  // Entrance animation: when a card becomes the new top after swipe,
  // it appears with a subtle "Apple-like" motion: fade + lift + gentle settle.
  useEffect(() => {
    const wasTop = prevIsTopRef.current;
    prevIsTopRef.current = isTop;

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!wasTop && isTop) {
      // Start slightly smaller, slightly lower, fully transparent.
      enterScale.value = 0.92;
      enterOpacity.value = 0;
      enterTranslateY.value = 10;

      // Opacity: quick, non-spring.
      enterOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });

      // TranslateY: ease out to 0.
      enterTranslateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });

      // Scale: subtle overshoot then settle (feels "native"/Apple-like).
      enterScale.value = withSequence(
        withTiming(1.02, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 16, stiffness: 180, mass: 0.9 })
      );
    }
  }, [isTop, enterOpacity, enterScale, enterTranslateY]);

  // Обновляем swRef при изменении windowWidth
  useEffect(() => { swRef.value = windowWidth; }, [windowWidth]);

  const swipeProgrammatically = (direction: 'left' | 'right') => {
    if (!isTop) return;
    if (disabled) return;
    if (programmaticInFlightRef.current) return;

    programmaticInFlightRef.current = true;

    if (onDragActiveChange) {
      onDragActiveChange(true);
    }

    const targetX = direction === 'right' ? windowWidth * 1.35 : -windowWidth * 1.35;
    const durationMs = 320;

    translateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
    translateX.value = withTiming(
      targetX,
      { duration: durationMs, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished) return;
        if (direction === 'right') {
          runOnJS(onSwipeRight)();
        } else {
          runOnJS(onSwipeLeft)();
        }
        runOnJS(endProgrammaticSwipe)();
      }
    );
  };

  useImperativeHandle(ref, () => ({
    swipe: swipeProgrammatically,
  }), [disabled, isTop, onSwipeLeft, onSwipeRight, windowWidth]);

  const tapGesture = Gesture.Tap()
    .enabled(isTop && !gesturesDisabled)
    .onEnd(() => {
      flipRotation.value = withTiming(isFlipped.value ? 0 : 180, { duration: 350 });
      isFlipped.value = !isFlipped.value;
      runOnJS(triggerHapticLight)();
    });

  const panGesture = Gesture.Pan()
    .enabled(isTop && !gesturesDisabled)
    .onBegin(() => {
      if (onDragActiveChange) {
        runOnJS(onDragActiveChange)(true);
      }
    })
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
      if (gesturesDisabled) {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        return;
      }
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(windowWidth * 1.5, {
          velocity: event.velocityX,
          damping: 20,
        });
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-windowWidth * 1.5, {
          velocity: event.velocityX,
          damping: 20,
        });
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        hapticTriggered.value = false;
      }
    })
    .onFinalize(() => {
      if (onDragActiveChange) {
        runOnJS(onDragActiveChange)(false);
      }
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const baseScale = 1 - stackIndex * 0.03;
  const yOffset = stackIndex * 8;

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-swRef.value / 2, 0, swRef.value / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: isTop ? translateX.value : 0 },
        {
          translateY: isTop
            ? translateY.value + yOffset + enterTranslateY.value
            : yOffset,
        },
        { rotate: `${isTop ? rotate : 0}deg` },
        { scale: baseScale * (isTop ? enterScale.value : 1) },
      ],
      opacity: hidden ? 0 : (isTop ? enterOpacity.value : 1),
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
          <Text style={[styles.originalText, { color: colors.text }]}>
            {frontSide === 'translation' ? safeTranslation : safeOriginal}
          </Text>
          {isTop && (
            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: colors.muted }]}>
                Нажмите, чтобы увидеть {frontSide === 'translation' ? 'слово' : 'перевод'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Обратная сторона — перевод */}
        <Animated.View style={[styles.cardFace, backStyle]}>
          <Text style={[styles.originalText, { color: colors.text }]}>{safeOriginal}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.translationText, { color: colors.primary }]}>{safeTranslation}</Text>
          {isTop && (
            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: colors.muted }]}>← не знаю · знаю →</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    maxWidth: 500,
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
