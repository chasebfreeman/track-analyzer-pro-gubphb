import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '@/styles/commonStyles';
import { GraphPoint } from '@/utils/graphFields';

interface ScatterPlotViewProps {
  points: GraphPoint[];
  xLabel: string;
  yLabel: string;
  onSelectPoint: (point: GraphPoint) => void;
}

const CHART_HEIGHT = 280;
const PADDING_LEFT = 56;
const PADDING_RIGHT = 24;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 44;

export default function ScatterPlotView({ points, xLabel, yLabel, onSelectPoint }: ScatterPlotViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const chartWidth = Math.max(Dimensions.get('window').width - 72, 320);

  if (points.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No graph points yet</Text>
        <Text style={styles.emptyText}>Try another field pair or use a track with more completed readings.</Text>
      </View>
    );
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const plotWidth = chartWidth - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const scaleX = (value: number) => {
    if (minX === maxX) return PADDING_LEFT + plotWidth / 2;
    return PADDING_LEFT + ((value - minX) / (maxX - minX)) * plotWidth;
  };

  const scaleY = (value: number) => {
    if (minY === maxY) return PADDING_TOP + plotHeight / 2;
    return PADDING_TOP + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;
  };

  const xTicks = buildTicks(minX, maxX);
  const yTicks = buildTicks(minY, maxY);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Scatter Plot</Text>
          <Text style={styles.subtitle}>{xLabel} vs {yLabel}</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0A84FF' }]} />
            <Text style={styles.legendText}>Left</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF7A00' }]} />
            <Text style={styles.legendText}>Right</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Line x1={PADDING_LEFT} y1={PADDING_TOP + plotHeight} x2={chartWidth - PADDING_RIGHT} y2={PADDING_TOP + plotHeight} stroke={colors.border} strokeWidth={1.5} />
          <Line x1={PADDING_LEFT} y1={PADDING_TOP} x2={PADDING_LEFT} y2={PADDING_TOP + plotHeight} stroke={colors.border} strokeWidth={1.5} />

          {xTicks.map((tick) => {
            const x = scaleX(tick);
            return (
              <React.Fragment key={`x-${tick}`}>
                <Line x1={x} y1={PADDING_TOP} x2={x} y2={PADDING_TOP + plotHeight} stroke={colors.border} strokeWidth={1} strokeOpacity={0.6} />
                <SvgText x={x} y={PADDING_TOP + plotHeight + 20} fontSize="10" textAnchor="middle" fill={colors.textSecondary}>
                  {formatTick(tick)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {yTicks.map((tick) => {
            const y = scaleY(tick);
            return (
              <React.Fragment key={`y-${tick}`}>
                <Line x1={PADDING_LEFT} y1={y} x2={chartWidth - PADDING_RIGHT} y2={y} stroke={colors.border} strokeWidth={1} strokeOpacity={0.6} />
                <SvgText x={PADDING_LEFT - 8} y={y + 4} fontSize="10" textAnchor="end" fill={colors.textSecondary}>
                  {formatTick(tick)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {points.map((point) => (
            <Circle
              key={point.id}
              cx={scaleX(point.x)}
              cy={scaleY(point.y)}
              r={6}
              fill={point.lane === 'left' ? '#0A84FF' : '#FF7A00'}
              opacity={0.88}
              onPress={() => onSelectPoint(point)}
            />
          ))}

          <SvgText x={PADDING_LEFT + plotWidth / 2} y={CHART_HEIGHT - 8} fontSize="12" textAnchor="middle" fill={colors.textSecondary}>
            {xLabel}
          </SvgText>
          <SvgText x={18} y={PADDING_TOP + plotHeight / 2} fontSize="12" textAnchor="middle" fill={colors.textSecondary} rotation={-90} origin="18,140">
            {yLabel}
          </SvgText>
        </Svg>
      </ScrollView>

      <Text style={styles.helper}>Tap any point to inspect the reading and jump into full details.</Text>
    </View>
  );
}

function buildTicks(min: number, max: number) {
  if (min === max) return [min];
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, index) => min + ((max - min) * index) / steps);
}

function formatTick(value: number) {
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(2).replace(/\.00$/, '');
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    legendRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 999 },
    legendText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    helper: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
    emptyState: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 28,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  });
}
