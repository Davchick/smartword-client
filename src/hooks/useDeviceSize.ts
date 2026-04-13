/**
 * Хук useDeviceSize
 *
 * Предоставляет информацию о категории устройства и адаптивные значения
 * для условного рендеринга и стилизации.
 *
 * Categories:
 * - small:  < 375px (iPhone SE, маленькие Android)
 * - medium: 375-413px (iPhone 13/14/15, стандартные Android)
 * - large:  >= 414px (Plus/Max модели, планшеты)
 *
 * @example
 * const { isSmall, isLarge, spacing, fontSize } = useDeviceSize();
 * <View style={{ padding: spacing.md }} />
 */

import { useWindowDimensions, Dimensions } from 'react-native';
import { useMemo } from 'react';
import { spacing as baseSpacing, typography as baseTypography, radii as baseRadii } from '../theme';

export type DeviceCategory = 'small' | 'medium' | 'large';

interface AdaptiveValues {
  /** Категория устройства */
  category: DeviceCategory;
  /** Маленькое устройство? */
  isSmall: boolean;
  /** Среднее устройство? */
  isMedium: boolean;
  /** Большое устройство? */
  isLarge: boolean;
  /** Текущая ширина экрана */
  width: number;
  /** Текущая высота экрана */
  height: number;
  /** Адаптивные отступы */
  spacing: typeof baseSpacing;
  /** Адаптивные размеры шрифтов */
  typography: typeof baseTypography;
  /** Адаптивные радиусы */
  radii: typeof baseRadii;
  /** Масштабный коэффициент (1.0 для medium, <1 для small, >1 для large) */
  scaleFactor: number;
}

/**
 * Рассчитать категорию устройства на основе ширины
 */
const getDeviceCategory = (width: number): DeviceCategory => {
  if (width < 375) return 'small';
  if (width >= 414) return 'large';
  return 'medium';
};

/**
 * Рассчитать масштабный коэффициент
 */
const getScaleFactor = (width: number): number => {
  // 390px как базовая ширина (iPhone 14/15)
  const baseWidth = 390;
  const ratio = width / baseWidth;
  // Ограничиваем от 0.85 до 1.15 чтобы не было экстремальных значений
  return Math.max(0.85, Math.min(1.15, ratio));
};

/**
 * Масштабировать объект значений
 */
const scaleObject = (
  obj: Record<string, number>,
  factor: number,
  minFactor = 0.7,
  maxFactor = 1.3
): Record<string, number> => {
  const scaled: Record<string, number> = {};
  for (const [key, value] of Object.entries(obj)) {
    const scaledValue = value * factor;
    // Clamp чтобы не было слишком маленьких/больших значений
    scaled[key] = Math.round(
      Math.max(value * minFactor, Math.min(value * maxFactor, scaledValue))
    );
  }
  return scaled;
};

export const useDeviceSize = (): AdaptiveValues => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const category = getDeviceCategory(width);
    const isSmall = category === 'small';
    const isMedium = category === 'medium';
    const isLarge = category === 'large';
    const scaleFactor = getScaleFactor(width);

    // Адаптируем значения на основе scale factor
    // Для small устройств уменьшаем, для large - увеличиваем
    const spacingMultiplier = isSmall ? 0.85 : isLarge ? 1.1 : 1;
    const fontMultiplier = isSmall ? 0.9 : isLarge ? 1.05 : 1;
    const radiusMultiplier = isSmall ? 0.9 : isLarge ? 1.1 : 1;

    return {
      category,
      isSmall,
      isMedium,
      isLarge,
      width,
      height,
      scaleFactor,
      spacing: {
        xs: Math.round(baseSpacing.xs * spacingMultiplier),
        sm: Math.round(baseSpacing.sm * spacingMultiplier),
        md: Math.round(baseSpacing.md * spacingMultiplier),
        lg: Math.round(baseSpacing.lg * spacingMultiplier),
        xl: Math.round(baseSpacing.xl * spacingMultiplier),
        xxl: Math.round(baseSpacing.xxl * spacingMultiplier),
      },
      typography: {
        title: Math.round(baseTypography.title * fontMultiplier),
        subtitle: Math.round(baseTypography.subtitle * fontMultiplier),
        body: Math.round(baseTypography.body * fontMultiplier),
        small: Math.round(baseTypography.small * fontMultiplier),
        xs: Math.round(baseTypography.xs * fontMultiplier),
        xsmall: Math.round(baseTypography.xsmall * fontMultiplier),
      },
      radii: {
        sm: Math.round(baseRadii.sm * radiusMultiplier),
        md: Math.round(baseRadii.md * radiusMultiplier),
        lg: Math.round(baseRadii.lg * radiusMultiplier),
        xl: Math.round(baseRadii.xl * radiusMultiplier),
        full: baseRadii.full,
      },
    };
  }, [width, height]);
};

/**
 * Хук для получения адаптивного количества колонок в grid
 *
 * @param itemMinWidth - минимальная ширина элемента
 * @param gap - расстояние между элементами
 */
export const useGridColumns = (itemMinWidth: number, gap = 12): number => {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const availableWidth = width - gap * 2; // учитываем horizontal padding
    return Math.max(1, Math.floor(availableWidth / (itemMinWidth + gap)));
  }, [width, itemMinWidth, gap]);
};

/**
 * Хук для условного рендеринга на основе размера экрана
 *
 * @example
 * const { ifSmall, ifMedium, ifLarge } = useResponsiveBreakpoints();
 *
 * {ifSmall(<CompactView />)}
 * {ifMedium(<StandardView />)}
 * {ifLarge(<ExpandedView />)}
 */
export const useResponsiveBreakpoints = () => {
  const { isSmall, isMedium, isLarge } = useDeviceSize();

  return {
    ifSmall: <T>(value: T): T | null => (isSmall ? value : null),
    ifMedium: <T>(value: T): T | null => (isMedium ? value : null),
    ifLarge: <T>(value: T): T | null => (isLarge ? value : null),
    ifSmallOrMedium: <T>(value: T): T | null => (isSmall || isMedium ? value : null),
    ifLargeOrMedium: <T>(value: T): T | null => (isMedium || isLarge ? value : null),
  };
};
