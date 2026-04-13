/**
 * Responsive Typography Hook
 *
 * Адаптирует размеры шрифтов на основе:
 * - Размера экрана устройства
 * - Настроек доступности (font scale)
 * - Ориентации экрана
 *
 * Гарантирует читаемость на всех устройствах:
 * - Маленькие экраны: уменьшаем но не меньше минимума
 * - Большие экраны: увеличиваем для лучшей читаемости
 * - Учитываем настройки доступности ОС
 *
 * @example
 * const { title, body, small } = useResponsiveTypography();
 *
 * <Text style={{ fontSize: title, fontFamily: fonts.bold }}>Title</Text>
 * <Text style={{ fontSize: body, lineHeight: body * 1.5 }}>Body text</Text>
 */

import { useWindowDimensions, Platform, AccessibilityInfo } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { typography, fonts } from '../theme';
import { moderateScale, clampScale, isSmallDevice, isLargeDevice } from '../utils/responsive';

interface ResponsiveTypography {
  /** Главный заголовок экрана (Welcome, Profile name) */
  title: number;
  /** Подзаголовок (section headers) */
  subtitle: number;
  /** Основной текст (body, descriptions) */
  body: number;
  /** Второстепенный текст (labels, captions) */
  small: number;
  /** Мелкий текст (hints, timestamps) */
  xs: number;
  /** Очень мелкий текст (legal, disclaimers) */
  xsmall: number;
  /** Line height для body (автоматически рассчитан) */
  bodyLineHeight: number;
  /** Line height для title */
  titleLineHeight: number;
  /** Множитель анимации (0 если reduce motion) */
  animationMultiplier: number;
  /** Reduce motion включен? */
  reduceMotion: boolean;
}

/**
 * Рассчитать line height на основе fontSize
 * Оптимально для читаемости: 1.4-1.6 для body, 1.2-1.3 для заголовков
 */
const getLineHeight = (fontSize: number, ratio = 1.5): number => {
  return Math.round(fontSize * ratio);
};

export const useResponsiveTypography = (): ResponsiveTypography => {
  const { width, height, fontScale } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const subscription = AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      subscription?.catch(() => {});
      listener?.remove();
    };
  }, []);

  return useMemo(() => {
    const isSmall = isSmallDevice();
    const isLarge = isLargeDevice();

    // Базовый множитель на основе ширины экрана
    const screenFactor = isSmall ? 0.88 : isLarge ? 1.08 : 1;

    // Учитываем настройки доступности ОС (fontScale)
    // Ограничиваем от 0.9 до 1.2 чтобы не ломать верстку
    const accessibilityFactor = clampScale(fontScale, 0.9, 1.2);

    // Комбинированный множитель
    const combinedFactor = screenFactor * accessibilityFactor;

    // Рассчитываем размеры шрифтов
    const titleSize = clampScale(
      Math.round(typography.title * combinedFactor),
      22, // минимум для маленьких экранов
      36  // максимум для больших
    );

    const subtitleSize = clampScale(
      Math.round(typography.subtitle * combinedFactor),
      15,
      22
    );

    const bodySize = clampScale(
      Math.round(typography.body * combinedFactor),
      13,
      18
    );

    const smallSize = clampScale(
      Math.round(typography.small * combinedFactor),
      11,
      15
    );

    const xsSize = clampScale(
      Math.round(typography.xs * combinedFactor),
      9,
      13
    );

    const xsmallSize = clampScale(
      Math.round(typography.xsmall * combinedFactor),
      8,
      12
    );

    return {
      title: titleSize,
      subtitle: subtitleSize,
      body: bodySize,
      small: smallSize,
      xs: xsSize,
      xsmall: xsmallSize,
      bodyLineHeight: getLineHeight(bodySize, 1.5),
      titleLineHeight: getLineHeight(titleSize, 1.25),
      animationMultiplier: reduceMotion ? 0 : 1,
      reduceMotion,
    };
  }, [width, height, fontScale, reduceMotion]);
};

/**
 * Хук для получения адаптивного шрифта с кастомными настройками
 *
 * @param baseSize - базовый размер шрифта
 * @param options - дополнительные настройки
 *
 * @example
 * const customSize = useAdaptiveFontSize(20, { min: 16, max: 28 });
 */
export const useAdaptiveFontSize = (
  baseSize: number,
  options?: {
    min?: number;
    max?: number;
    /** Учитывать настройки доступности? (default: true) */
    respectAccessibility?: boolean;
  }
): number => {
  const { fontScale } = useWindowDimensions();
  const {
    min = 10,
    max = 60,
    respectAccessibility = true,
  } = options || {};

  return useMemo(() => {
    const isSmall = isSmallDevice();
    const isLarge = isLargeDevice();

    const screenFactor = isSmall ? 0.88 : isLarge ? 1.08 : 1;
    const accessibilityFactor = respectAccessibility ? clampScale(fontScale, 0.9, 1.2) : 1;

    const scaled = Math.round(baseSize * screenFactor * accessibilityFactor);
    return clampScale(scaled, min, max);
  }, [baseSize, fontScale, min, max, respectAccessibility]);
};

/**
 * Хук для адаптивного line height
 *
 * @param fontSize - размер шрифта
 * @param ratio - множитель (default: 1.5 для body, 1.25 для заголовков)
 */
export const useAdaptiveLineHeight = (
  fontSize: number,
  ratio = 1.5
): number => {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    return Math.round(fontSize * ratio);
  }, [fontSize, ratio, width]);
};

/**
 * Получить полный стиль текста (fontSize + lineHeight + fontFamily)
 *
 * @example
 * const titleStyle = useTextStyle('title');
 * <Text style={titleStyle}>Hello</Text>
 */
export const useTextStyle = (
  variant: 'title' | 'subtitle' | 'body' | 'small' | 'xs' | 'xsmall',
  options?: {
    fontFamily?: string;
    /** Переопределить font weight */
    fontWeight?: TextStyle['fontWeight'];
    /** Переопределить color */
    color?: string;
  }
) => {
  const typography = useResponsiveTypography();
  const { fontFamily, fontWeight, color } = options || {};

  return useMemo(() => {
    const fontSizeMap = {
      title: typography.title,
      subtitle: typography.subtitle,
      body: typography.body,
      small: typography.small,
      xs: typography.xs,
      xsmall: typography.xsmall,
    };

    const lineHeightMap = {
      title: typography.titleLineHeight,
      subtitle: Math.round(typography.subtitle * 1.35),
      body: typography.bodyLineHeight,
      small: Math.round(typography.small * 1.45),
      xs: Math.round(typography.xs * 1.4),
      xsmall: Math.round(typography.xsmall * 1.35),
    };

    const style: TextStyle = {
      fontSize: fontSizeMap[variant],
      lineHeight: lineHeightMap[variant],
      fontFamily: fontFamily || fonts.regular,
    };

    if (fontWeight) style.fontWeight = fontWeight;
    if (color) style.color = color;

    return style;
  }, [typography, variant, fontFamily, fontWeight, color]);
};

import type { TextStyle } from 'react-native';
