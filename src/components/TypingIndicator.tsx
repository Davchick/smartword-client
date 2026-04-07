import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  useAnimatedRef,
} from 'react-native-reanimated';
import { useTheme, spacing, radii } from '../theme';

const Dot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3);
  const animatedRef = useAnimatedRef();
  const { colors } = useTheme();

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 400 }), -1, true)
    );

    return () => {
      // Корректно отменяем анимацию при размонтировании
      cancelAnimation(opacity);
      opacity.value = 0.3;
    };
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: colors.muted }, style]} />;
};

export const TypingIndicator = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
