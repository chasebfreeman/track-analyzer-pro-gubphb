
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useThemeColors } from '@/styles/commonStyles';
import { TrackReading } from '@/types/TrackData';

interface DailyReadingChartProps {
  readings: TrackReading[];
  date: string;
}

export default function DailyReadingChart({ readings, date }: DailyReadingChartProps) {
  const colors = useThemeColors();
  const screenWidth = Dimensions.get('window').width;

  if (readings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No readings available for this day
        </Text>
      </View>
    );
  }

  // Sort readings by time
  const sortedReadings = [...readings].sort((a, b) => {
    const timeA = a.time.split(':').map(Number);
    const timeB = b.time.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });

  // Extract data for each metric (averaging left and right lanes)
  const labels = sortedReadings.map(r => r.time);
  
  const kegSLData = sortedReadings.map(r => {
    const left = parseFloat(r.leftLane.kegSL) || 0;
    const right = parseFloat(r.rightLane.kegSL) || 0;
    return (left + right) / 2;
  });

  const grippoSLData = sortedReadings.map(r => {
    const left = parseFloat(r.leftLane.grippoSL) || 0;
    const right = parseFloat(r.rightLane.grippoSL) || 0;
    return (left + right) / 2;
  });

  const uvIndexData = sortedReadings.map(r => {
    const left = parseFloat(r.leftLane.uvIndex) || 0;
    const right = parseFloat(r.rightLane.uvIndex) || 0;
    return (left + right) / 2;
  });

  const trackTempData = sortedReadings.map(r => {
    const left = parseFloat(r.leftLane.trackTemp) || 0;
    const right = parseFloat(r.rightLane.trackTemp) || 0;
    return (left + right) / 2;
  });

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  const renderChart = (
    title: string,
    data: number[],
    color: string,
    unit: string
  ) => {
    const chartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          color: (opacity = 1) => color,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          {title} {unit && `(${unit})`}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(screenWidth - 32, labels.length * 80)}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => color,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
          />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Daily Readings - {date}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Average of Left and Right Lanes
      </Text>
      
      {renderChart('Keg @ Hit', kegSLData, '#007bff', '')}
      {renderChart('Grippo @ Hit', grippoSLData, '#28a745', '')}
      {renderChart('UV Index', uvIndexData, '#ffc107', '')}
      {renderChart('Track Temp', trackTempData, '#dc3545', 'Â°F')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

