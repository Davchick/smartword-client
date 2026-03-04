import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme, spacing, radii, typography, fonts } from '../theme';
import type { TrainingDayProgress } from '../hooks/useTrainingProgress';

interface ProgressChartProps {
  data: TrainingDayProgress[];
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = Dimensions.get('window').width - spacing.lg * 2;
const PADDING = 40;

// Turquoise-green gradient
const GRADIENT_START = '#06D6A0';
const GRADIENT_END = '#04916A';

export const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0));
  const lineAnim = useRef(new Animated.Value(0));
  const [lineProgress, setLineProgress] = useState(0);

  const maxPoints = Math.max(...data.map((d) => d.points), 1);
  const totalPoints = data.reduce((sum, d) => sum + d.points, 0);

  useEffect(() => {
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
    ]).start();

    return () => {
      lineAnim.current.removeListener(listener);
    };
  }, [data]);

  // Generate smooth curve path
  const generateCurvePath = (progress: number) => {
    if (data.length === 0) return '';

    const chartInnerWidth = CHART_WIDTH - PADDING * 2;
    const chartInnerHeight = CHART_HEIGHT - PADDING * 2;
    const stepX = chartInnerWidth / (data.length - 1 || 1);

    const points = data.map((day, i) => ({
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
    return `${curvePath} L ${CHART_WIDTH - PADDING} ${CHART_HEIGHT - PADDING} L ${PADDING} ${CHART_HEIGHT - PADDING} Z`;
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
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={GRADIENT_START} stopOpacity="0.4" />
              <Stop offset="1" stopColor={GRADIENT_END} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={GRADIENT_START} stopOpacity="1" />
              <Stop offset="1" stopColor={GRADIENT_END} stopOpacity="1" />
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
          {data.map((day, i) => {
            const chartInnerWidth = CHART_WIDTH - PADDING * 2;
            const chartInnerHeight = CHART_HEIGHT - PADDING * 2;
            const stepX = chartInnerWidth / (data.length - 1 || 1);
            const x = PADDING + i * stepX;
            const y = CHART_HEIGHT - PADDING - (day.points / maxPoints) * chartInnerHeight;

            return (
              <G key={day.date}>
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
        </Svg>
      </View>
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
});
