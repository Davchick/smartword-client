import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, G, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme, spacing, radii, typography, fonts } from '../theme';
import type { TrainingDayProgress } from '../hooks/useTrainingProgress';

// Проверяем, что blur работает (не Expo Go)
const supportsBlur = Platform.OS !== 'ios' || !__DEV__;

interface ProgressChartProps {
  data: TrainingDayProgress[];
  locked?: boolean;
}

const CHART_HEIGHT = 160;
const PADDING = 40;

// Turquoise-green gradient
const GRADIENT_START = '#06D6A0';
const GRADIENT_END = '#04916A';

// Default empty data for 7 days - attractive curve to tempt users
const DEFAULT_EMPTY_DATA: TrainingDayProgress[] = [
  { date: '', dayLabel: 'Пн', points: 12, isToday: false },
  { date: '', dayLabel: 'Вт', points: 28, isToday: false },
  { date: '', dayLabel: 'Ср', points: 15, isToday: false },
  { date: '', dayLabel: 'Чт', points: 42, isToday: false },
  { date: '', dayLabel: 'Пт', points: 35, isToday: false },
  { date: '', dayLabel: 'Сб', points: 58, isToday: false },
  { date: '', dayLabel: 'Вс', points: 47, isToday: true },
];

export const ProgressChart: React.FC<ProgressChartProps> = ({ data, locked = false }) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = useMemo(() => windowWidth - spacing.lg * 2, [windowWidth]);
  const fadeAnim = useRef(new Animated.Value(0));
  const lineAnim = useRef(new Animated.Value(0));
  const [lineProgress, setLineProgress] = useState(0);
  const animatingRef = useRef(false);

  // Стабилизируем данные — не пересоздаём массив каждый рендер
  const chartData = useMemo(
    () => data.length > 0 ? data : DEFAULT_EMPTY_DATA,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.length, JSON.stringify(data)]
  );
  const maxPoints = useMemo(() => Math.max(...chartData.map((d) => d.points), 1), [chartData]);
  const totalPoints = useMemo(() => {
    const src = locked ? DEFAULT_EMPTY_DATA : chartData;
    return src.reduce((sum, d) => sum + d.points, 0);
  }, [locked, chartData]);

  // Запускаем анимацию только один раз при монтировании или смене данных
  useEffect(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    fadeAnim.current.setValue(0);
    lineAnim.current.setValue(0);
    setLineProgress(0);

    const listener = lineAnim.current.addListener(({ value }) => {
      setLineProgress(value);
    });

    Animated.parallel([
      Animated.timing(fadeAnim.current, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(lineAnim.current, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      animatingRef.current = false;
    });

    return () => {
      lineAnim.current.removeListener(listener);
    };
  }, [chartData]); // Перезапуск при смене данных — анимация покажет новый график

  // Generate smooth curve path
  const generateCurvePath = (progress: number) => {
    if (chartData.length === 0) return '';

    const chartInnerWidth = chartWidth - PADDING * 2;
    const chartInnerHeight = CHART_HEIGHT - PADDING * 2;
    const stepX = chartInnerWidth / (chartData.length - 1 || 1);

    const points = chartData.map((day, i) => ({
      x: PADDING + i * stepX,
      y: CHART_HEIGHT - PADDING - (day.points / maxPoints) * chartInnerHeight,
      points: day.points,
      isToday: day.isToday,
      dayLabel: day.dayLabel,
    }));

    if (points.length === 0) return '';

    // Create smooth curve using Catmull-Rom spline approximation
    let path = `M ${points[0]!.x} ${points[0]!.y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;

      const cp1x = p1.x + (p2.x - p0.x) / 6 * progress;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * progress;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * progress;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * progress;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  // Generate area fill path
  const generateAreaPath = (progress: number) => {
    const curvePath = generateCurvePath(progress);
    return `${curvePath} L ${chartWidth - PADDING} ${CHART_HEIGHT - PADDING} L ${PADDING} ${CHART_HEIGHT - PADDING} Z`;
  };

  const curvePath = generateCurvePath(lineProgress);
  const areaPath = generateAreaPath(lineProgress);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim.current }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Прогресс за 7 дней</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{totalPoints}</Text>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={GRADIENT_START} stopOpacity="0.4" />
              <Stop offset="1" stopColor={GRADIENT_END} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={GRADIENT_START} stopOpacity="1" />
              <Stop offset="1" stopColor={GRADIENT_END} stopOpacity="1" />
            </LinearGradient>
            {/* Gradient overlay for locked state */}
            <LinearGradient id="lockGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>

          {/* Area fill */}
          <Path d={areaPath} fill="url(#areaGradient)" />

          {/* Curve line */}
          <Path
            d={curvePath}
            fill="none"
            stroke={GRADIENT_START}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points and labels */}
          {chartData.map((day, i) => {
            const chartInnerWidth = chartWidth - PADDING * 2;
            const chartInnerHeight = CHART_HEIGHT - PADDING * 2;
            const stepX = chartInnerWidth / (chartData.length - 1 || 1);
            const x = PADDING + i * stepX;
            const y = CHART_HEIGHT - PADDING - (day.points / maxPoints) * chartInnerHeight;

            return (
              <G key={`${day.date}-${day.dayLabel}-${i}`}>
                {/* Point */}
                <SvgText
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={11}
                  fontFamily={fonts.medium}
                >
                  {day.points}
                </SvgText>

                {/* Day label */}
                <SvgText
                  x={x}
                  y={CHART_HEIGHT - 12}
                  textAnchor="middle"
                  fill={day.isToday ? colors.primary : colors.muted}
                  fontSize={12}
                  fontFamily={fonts.medium}
                >
                  {day.dayLabel}
                </SvgText>

                {/* Today indicator dot */}
                {day.isToday && (
                  <SvgText
                    x={x}
                    y={CHART_HEIGHT - 24}
                    textAnchor="middle"
                    fill={GRADIENT_START}
                    fontSize={16}
                  >
                    ●
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* White overlay for locked state to obscure the chart */}
          {locked && (
            <Path
              d={`M ${PADDING} ${CHART_HEIGHT - PADDING} L ${chartWidth - PADDING} ${CHART_HEIGHT - PADDING} L ${chartWidth - PADDING} ${PADDING * 0.5} L ${PADDING} ${PADDING * 0.5} Z`}
              fill="url(#lockGradient)"
            />
          )}
        </Svg>
      </View>

      {/* Lock overlay */}
      {locked && (
        <View style={styles.lockOverlay}>
          {supportsBlur ? (
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={styles.blurView} experimentalBlurMethod="dimezisBlurView">
              <View style={styles.lockContent}>
                <View style={styles.lockIconContainer}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
                <Text style={[styles.lockTitle, { color: colors.text }]}>Войдите в аккаунт</Text>
                <Text style={[styles.lockSubtitle, { color: colors.muted }]}>
                  Чтобы видеть статистику и отслеживать свой прогресс
                </Text>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.lockContent, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)' }]}>
              <View style={styles.lockIconContainer}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={[styles.lockTitle, { color: colors.text }]}>Войдите в аккаунт</Text>
              <Text style={[styles.lockSubtitle, { color: colors.muted }]}>
                Чтобы видеть статистику и отслеживать свой прогресс
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  totalValue: {
    fontSize: typography.subtitle,
    fontFamily: fonts.bold,
  },
  chartContainer: {
    alignItems: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockContent: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: supportsBlur 
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  lockIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(6, 214, 160, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: 'rgba(6, 214, 160, 0.3)',
  },
  lockIcon: {
    fontSize: 26,
  },
  lockTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  lockSubtitle: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    textAlign: 'center',
    maxWidth: 200,
  },
});
