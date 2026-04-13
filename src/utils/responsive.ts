/**
 * Responsive Scaling Utilities
 *
 * Best practices:
 * - moderateScale для размеров (icon, avatar, button) - меньше растет на больших экранах
 * - scale для ширины/горизонтальных элементов
 * - verticalScale для высоты/вертикальных отступов
 * - Всегда ограничиваем min/max чтобы не ломалось на крайних устройствах
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Базовые размеры для масштабирования (iPhone 14/15 как стандарт)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Горизонтальное масштабирование
 */
export const scale = (size: number, factor = 0.5): number => {
  const scaled = (SCREEN_WIDTH / BASE_WIDTH) * size;
  const diff = scaled - size;
  const result = size + diff * factor;
  return Math.round(result);
};

/**
 * Вертикальное масштабирование
 */
export const verticalScale = (size: number, factor = 0.5): number => {
  const scaled = (SCREEN_HEIGHT / BASE_HEIGHT) * size;
  const diff = scaled - size;
  const result = size + diff * factor;
  return Math.round(result);
};

/**
 * Умеренное масштабирование (рекомендуется для большинства элементов)
 * Медленнее растет чем обычный scale - не дает элементам стать гигантскими
 */
export const moderateScale = (size: number, factor = 0.3): number => {
  const scaled = (SCREEN_WIDTH / BASE_WIDTH) * size;
  const diff = scaled - size;
  const result = size + diff * factor;
  return Math.round(result);
};

/**
 * Масштабирование с ограничением (clamp)
 * Гарантирует что размер не выйдет за пределы [min, max]
 */
export const clampScale = (size: number, min: number, max: number): number => {
  return Math.min(Math.max(size, min), max);
};

/**
 * Адаптивный размер на основе ширины экрана
 * Возвращает процент от ширины экрана с ограничениями
 */
export const responsiveWidth = (percentage: number, min?: number, max?: number): number => {
  const result = (SCREEN_WIDTH * percentage) / 100;
  if (min !== undefined && result < min) return min;
  if (max !== undefined && result > max) return max;
  return result;
};

/**
 * Адаптивная высота на основе высоты экрана
 */
export const responsiveHeight = (percentage: number, min?: number, max?: number): number => {
  const result = (SCREEN_HEIGHT * percentage) / 100;
  if (min !== undefined && result < min) return min;
  if (max !== undefined && result > max) return max;
  return result;
};

/**
 * Адаптивный размер шрифта с ограничениями
 * Использует moderateScale + clamp для стабильности
 */
export const responsiveFontSize = (
  baseSize: number,
  options?: {
    min?: number;
    max?: number;
    factor?: number;
  }
): number => {
  const { min = 10, max = 60, factor = 0.3 } = options || {};
  const scaled = moderateScale(baseSize, factor);
  return clampScale(scaled, min, max);
};

/**
 * Адаптивные отступы
 */
export const responsiveSpacing = (baseSpacing: number, min?: number, max?: number): number => {
  const scaled = moderateScale(baseSpacing, 0.4);
  return clampScale(scaled, min ?? Math.round(baseSpacing * 0.7), max ?? Math.round(baseSpacing * 1.4));
};

/**
 * Адаптивный радиус скругления
 */
export const responsiveRadius = (baseRadius: number, min?: number, max?: number): number => {
  const scaled = moderateScale(baseRadius, 0.3);
  return clampScale(scaled, min ?? baseRadius, max ?? Math.round(baseRadius * 1.5));
};

/**
 * Получить статус устройства (маленький, средний, большой)
 */
export const getDeviceCategory = (): 'small' | 'medium' | 'large' => {
  if (SCREEN_WIDTH < 375) return 'small';
  if (SCREEN_WIDTH >= 414) return 'large';
  return 'medium';
};

/**
 * Проверка на маленькое устройство (iPhone SE, маленькие Android)
 */
export const isSmallDevice = (): boolean => SCREEN_WIDTH < 375;

/**
 * Проверка на большое устройство (Plus/Max модели, планшеты)
 */
export const isLargeDevice = (): boolean => SCREEN_WIDTH >= 414;

/**
 * Проверка на ландшафтную ориентацию
 */
export const isLandscape = (): boolean => SCREEN_WIDTH > SCREEN_HEIGHT;

/**
 * Получить безопасную ширину для контента
 * Учитывает safe area insets для очень маленьких экранов
 */
export const getSafeContentWidth = (safeAreaInsets?: { left: number; right: number }): number => {
  const insets = safeAreaInsets || { left: 0, right: 0 };
  return SCREEN_WIDTH - insets.left - insets.right;
};

/**
 * Рассчитать количество элементов в строке
 * Для flatlist/grid на разных экранах
 */
export const getNumColumns = (itemMinWidth: number, gap = 0): number => {
  const availableWidth = SCREEN_WIDTH - gap * 2; // учитываем padding
  return Math.max(1, Math.floor(availableWidth / (itemMinWidth + gap)));
};

/**
 * Platform-aware scaling (немного уменьшаем на Android для консистентности)
 */
export const platformScale = (size: number): number => {
  const scaled = moderateScale(size, 0.3);
  return Platform.OS === 'android' ? Math.round(scaled * 0.95) : Math.round(scaled);
};

// Экспортируем текущие размеры экрана для прямого использования
export { SCREEN_WIDTH, SCREEN_HEIGHT, BASE_WIDTH, BASE_HEIGHT };
