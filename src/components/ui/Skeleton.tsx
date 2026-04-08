import React, { useEffect } from 'react';
import { ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme, radii } from '../../theme';

type Props = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Базовый skeleton-блок с shimmer-анимацией.
 * Использует Reanimated для плавного pulse-эффекта.
 */
export const Skeleton = ({
  width = '100%',
  height = 20,
  borderRadius = radii.sm,
  style,
}: Props) => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    return () => {
      opacity.value = 0.4;
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.elevated,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};
