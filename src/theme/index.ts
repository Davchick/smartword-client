import { useColorScheme } from 'react-native';
import { useThemeContext } from './ThemeContext';

// --- Цветовые палитры ---
const dark = {
  background: '#020617',
  card: '#0F172A',
  elevated: '#1E293B',
  surface: '#1E293B',
  border: '#334155',
  primary: '#38BDF8',
  primaryDim: '#0C4A6E',
  success: '#34D399',
  danger: '#FB7185',
  dangerDim: '#7F1D2D',
  text: '#F9FAFB',
  textSecondary: '#CBD5E1',
  muted: '#6B7280',
  tabBar: '#0F172A',
};

const light = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  surface: '#F1F5F9',
  border: '#E2E8F0',
  primary: '#0EA5E9',
  primaryDim: '#E0F2FE',
  success: '#10B981',
  danger: '#F43F5E',
  dangerDim: '#FFE4E6',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#94A3B8',
  tabBar: '#FFFFFF',
};

export type ColorScheme = typeof dark;

export const getColors = (scheme: 'dark' | 'light' | null | undefined): ColorScheme =>
  scheme === 'light' ? light : dark;

// Дефолтные цвета (тёмная тема) — для StyleSheet.create вне компонентов
const colorsObj = dark;
export { colorsObj as colors };

// --- Отступы ---
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// --- Радиусы ---
export const radii = {
  sm: 8,
  md: 14,
  lg: 24,
  xl: 32,
  full: 999,
};

// --- Размеры шрифтов ---
export const typography = {
  title: 28,
  subtitle: 18,
  body: 16,
  small: 13,
  xs: 11,
  xsmall: 10,
};

// --- Семейства шрифтов ---
// Montserrat — для русского текста (body, labels, UI)
// Poppins — для английских заголовков и акцентов
export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  bold: 'Montserrat_600SemiBold',
  black: 'Montserrat_700Bold',
  // Poppins для заголовков (EN)
  headingMedium: 'Poppins_600SemiBold',
  headingBold: 'Poppins_700Bold',
  headingBlack: 'Poppins_800ExtraBold',
};

// --- Хук для использования в компонентах ---
export const useTheme = () => {
  const { resolvedScheme } = useThemeContext();
  return {
    colors: getColors(resolvedScheme),
    isDark: resolvedScheme !== 'light',
    scheme: resolvedScheme,
  };
};
