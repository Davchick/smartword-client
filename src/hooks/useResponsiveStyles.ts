/**
 * Хук useResponsiveStyles
 *
 * Автоматически масштабирует StyleSheet на основе размера экрана.
 * Позволяет писать обычные стили, а они будут адаптивными.
 *
 * @example
 * const styles = useResponsiveStyles({
 *   container: { padding: 16, borderRadius: 12 },
 *   title: { fontSize: 24, lineHeight: 32 },
 *   icon: { width: 40, height: 40 },
 * });
 *
 * <View style={styles.container}>
 *   <Text style={styles.title}>Hello</Text>
 * </View>
 */

import { useWindowDimensions, Platform, StyleSheet, Dimensions as RNDimensions } from 'react-native';
import { useMemo } from 'react';
import { moderateScale, scale, verticalScale, clampScale, isSmallDevice, isLargeDevice } from '../utils/responsive';

/**
 * Тип для поддерживаемых стилей
 */
type ResponsiveStyle = Record<string, any>;

/**
 * Рекурсивно масштабирует объект стилей
 */
const scaleStyle = (style: ResponsiveStyle): ResponsiveStyle => {
  if (!style || typeof style !== 'object') return style;

  const scaled: ResponsiveStyle = {};

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;

    // Обрабатываем специфичные свойства
    switch (key) {
      // Font size - масштабируем умеренно
      case 'fontSize':
      case 'lineHeight':
        if (typeof value === 'number') {
          (scaled as Record<string, any>)[key] = moderateScale(value, 0.3);
        }
        break;

      // Ширина - адаптируем к экрану
      case 'width':
      case 'minWidth':
      case 'maxWidth':
      case 'paddingLeft':
      case 'paddingRight':
      case 'paddingHorizontal':
      case 'marginLeft':
      case 'marginRight':
      case 'marginHorizontal':
      case 'left':
      case 'right':
        if (typeof value === 'number' && value > 0) {
          // Не масштабируем 100% и процентные значения
          (scaled as Record<string, any>)[key] = scale(value, 0.4);
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
        break;

      // Высота - вертикальное масштабирование
      case 'height':
      case 'minHeight':
      case 'maxHeight':
      case 'paddingTop':
      case 'paddingBottom':
      case 'paddingVertical':
      case 'marginTop':
      case 'marginBottom':
      case 'marginVertical':
      case 'top':
      case 'bottom':
        if (typeof value === 'number' && value > 0) {
          (scaled as Record<string, any>)[key] = verticalScale(value, 0.4);
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
        break;

      // Радиусы - умеренное масштабирование
      case 'borderRadius':
      case 'borderTopLeftRadius':
      case 'borderTopRightRadius':
      case 'borderBottomLeftRadius':
      case 'borderBottomRightRadius':
        if (typeof value === 'number' && value < 999) { // не трогаем 999 (full circle)
          (scaled as Record<string, any>)[key] = moderateScale(value, 0.2);
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
        break;

      // Padding/Margin общий
      case 'padding':
      case 'margin':
        if (typeof value === 'number') {
          (scaled as Record<string, any>)[key] = moderateScale(value, 0.35);
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
        break;

      // Letter spacing - минимальное масштабирование
      case 'letterSpacing':
        if (typeof value === 'number') {
          (scaled as Record<string, any>)[key] = value; // не масштабируем, критично для читаемости
        }
        break;

      // Border width - минимальное масштабирование
      case 'borderWidth':
      case 'borderTopWidth':
      case 'borderBottomWidth':
      case 'borderLeftWidth':
      case 'borderRightWidth':
        if (typeof value === 'number') {
          // Clamp от 0.5 до 3 чтобы не исчезали и не были слишком толстыми
          (scaled as Record<string, any>)[key] = clampScale(value, 0.5, 3);
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
        break;

      // Shadow offset
      case 'shadowOffset':
        if (typeof value === 'object' && value !== null) {
          (scaled as Record<string, any>)[key] = {
            width: typeof value.width === 'number' ? moderateScale(value.width, 0.2) : value.width,
            height: typeof value.height === 'number' ? moderateScale(value.height, 0.2) : value.height,
          };
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
        break;

      // Вложенные объекты (например transform)
      case 'transform':
        if (Array.isArray(value)) {
          scaled[key] = value.map((item) => {
            if (typeof item === 'object') {
              const scaledItem: Record<string, any> = {};
              for (const [tKey, tValue] of Object.entries(item)) {
                if (typeof tValue === 'number') {
                  scaledItem[tKey] = moderateScale(tValue, 0.3);
                } else {
                  scaledItem[tKey] = tValue;
                }
              }
              return scaledItem;
            }
            return item;
          });
        } else {
          scaled[key] = value;
        }
        break;

      // Все остальные свойства - без изменений
      default:
        if (typeof value === 'number') {
          // Числовые значения которые не попали в special cases
          (scaled as Record<string, any>)[key] = value;
        } else {
          (scaled as Record<string, any>)[key] = value;
        }
    }
  }

  return scaled;
};

/**
 * Основной хук для создания responsive styles
 */
export const useResponsiveStyles = <T extends Record<string, ResponsiveStyle>>(
  styleFactory: (params: {
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
    scale: typeof moderateScale;
    width: number;
    height: number;
  }) => T
): T => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isSmall = isSmallDevice();
    const isMedium = !isSmall && !isLargeDevice();
    const isLarge = isLargeDevice();

    const styles = styleFactory({
      isSmall,
      isMedium,
      isLarge,
      scale: moderateScale,
      width,
      height,
    });

    // Масштабируем все стили
    const scaledStyles: Record<string, ResponsiveStyle> = {};
    for (const [key, value] of Object.entries(styles)) {
      scaledStyles[key] = scaleStyle(value);
    }

    return scaledStyles as T;
  }, [width, height, styleFactory]);
};

/**
 * Упрощенная версия - просто масштабирует готовый объект стилей
 * Для случаев когда не нужна conditional logic
 */
export const useScaledStyles = <T extends Record<string, ResponsiveStyle>>(styles: T): T => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const scaledStyles: Record<string, ResponsiveStyle> = {};
    for (const [key, value] of Object.entries(styles)) {
      scaledStyles[key] = scaleStyle(value);
    }
    return scaledStyles as T;
  }, [styles, width, height]);
};

/**
 * Создать адаптивный стиль для конкретного элемента
 * Возвращает функцию которая принимает тему и возвращает стиль
 *
 * @example
 * const getButtonStyle = createAdaptiveStyle(
 *   ({ isSmall, colors }) => ({
 *     padding: isSmall ? 12 : 16,
 *     backgroundColor: colors.primary,
 *   })
 * );
 */
export const createAdaptiveStyle = <T extends ResponsiveStyle>(
  styleFn: (params: {
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
    width: number;
    height: number;
  }) => T
): T => {
  const { width, height } = RNDimensions.get('window');
  const isSmall = isSmallDevice();
  const isMedium = !isSmall && !isLargeDevice();
  const isLarge = isLargeDevice();

  return styleFn({ isSmall, isMedium, isLarge, width, height });
};
