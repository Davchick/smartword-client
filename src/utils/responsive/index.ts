/**
 * Responsive Design System
 *
 * Centralized export for all responsive utilities
 *
 * Usage:
 * import { useDeviceSize, useResponsiveStyles, useResponsiveTypography } from '@/utils/responsive';
 */

// Scaling functions
export {
  scale,
  verticalScale,
  moderateScale,
  clampScale,
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
  responsiveSpacing,
  responsiveRadius,
  getDeviceCategory,
  isSmallDevice,
  isLargeDevice,
  isLandscape,
  getSafeContentWidth,
  getNumColumns,
  platformScale,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BASE_WIDTH,
  BASE_HEIGHT,
} from '../responsive';

// Hooks
export { useDeviceSize, useGridColumns, useResponsiveBreakpoints } from '../../hooks/useDeviceSize';
export { useResponsiveStyles, useScaledStyles, createAdaptiveStyle } from '../../hooks/useResponsiveStyles';
export {
  useResponsiveTypography,
  useAdaptiveFontSize,
  useAdaptiveLineHeight,
  useTextStyle,
} from '../../hooks/useResponsiveTypography';

// Types
export type { DeviceCategory } from '../../hooks/useDeviceSize';
