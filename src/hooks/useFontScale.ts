import { useWindowDimensions, AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';
import { typography } from '../theme';

/**
 * Хук для получения масштаба шрифта на основе настроек доступности устройства
 * 
 * @example
 * const fontScale = useFontScale();
 * const fontSize = typography.body * fontScale;
 */
export const useFontScale = () => {
  const { fontScale } = useWindowDimensions();
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

  return {
    fontScale,
    reduceMotion,
    // Множитель для анимаций (0 если reduce motion включён)
    animationMultiplier: reduceMotion ? 0 : 1,
  };
};

/**
 * Утилита для получения масштабируемого размера шрифта
 * 
 * @param baseSize - базовый размер шрифта
 * @param fontScale - масштаб шрифта из useFontScale
 * @returns масштабированный размер
 */
export const getScaledFontSize = (baseSize: number, fontScale: number): number => {
  // Ограничиваем масштаб от 0.8 до 1.3 чтобы не ломать верстку
  const clampedScale = Math.max(0.8, Math.min(1.3, fontScale));
  return Math.round(baseSize * clampedScale);
};
