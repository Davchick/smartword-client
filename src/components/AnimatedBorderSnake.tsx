import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface AnimatedBorderSnakeProps {
  /** Акцентный цвет змейки */
  color: string;
  /** Ширина и высота внутренней области (квадрат без бордера) */
  size: number;
  /** Толщина линии змейки */
  strokeWidth?: number;
  /** Радиус скругления углов */
  borderRadius?: number;
}

/**
 * Компонент анимированной змейки, бегущей по контуру квадрата.
 * Рисует SVG-прямоугольник с анимированным strokeDashoffset,
 * создавая эффект «змеи, гоняющейся за своим хвостом».
 * Позиционируется абсолютно поверх дочернего элемента.
 */
export const AnimatedBorderSnake: React.FC<AnimatedBorderSnakeProps> = ({
  color,
  size,
  strokeWidth = 2,
  borderRadius = 8,
}) => {
  // Контур чуть больше контента, чтобы бордер был снаружи
  const halfStroke = strokeWidth / 2;
  const contourSize = size + strokeWidth;

  // Периметр прямоугольника со скруглёнными углами
  // Формула: 4 * side - 8 * r + 2 * PI * r
  const side = contourSize;
  const r = borderRadius;
  const perimeter = 4 * side - 8 * r + 2 * Math.PI * r;

  // Длина видимого сегмента змейки (~55% периметра — почти замыкает)
  const snakeLength = perimeter * 0.55;

  // Анимированное смещение штриха
  const offset = useSharedValue(0);

  useEffect(() => {
    // Бесконечная плавная анимация от 0 до perimeter
    offset.value = withRepeat(
      withTiming(perimeter, {
        duration: 2200,
        easing: Easing.linear,
      }),
      -1, // бесконечный повтор
      false // не реверсировать
    );

    return () => {
      cancelAnimation(offset);
      offset.value = 0;
    };
  }, [perimeter]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  // SVG должен быть чуть больше квадрата, чтобы бордер не обрезался
  const svgSize = contourSize + strokeWidth * 2;
  const svgOffset = strokeWidth / 2;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          left: -svgOffset,
          top: -svgOffset,
          width: svgSize,
          height: svgSize,
        },
      ]}
      pointerEvents="none"
    >
      <Svg width={svgSize} height={svgSize}>
        <AnimatedRect
          x={halfStroke}
          y={halfStroke}
          width={contourSize}
          height={contourSize}
          rx={r}
          ry={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={[snakeLength, perimeter - snakeLength]}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};
