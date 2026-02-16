
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useThemeColors } from '@/styles/commonStyles';
import { TrackReading } from '@/types/TrackData';

interface HistoricalAveragesChartProps {
  readings: TrackReading[];
  trackName: string;
}

interface AverageData {
  kegSL: number;
  grippoSL: number;
  uvIndex: number;
  trackTemp: number;
  count: number;
}

export default function HistoricalAveragesChart({ 
  readings, 
  trackName 
}: HistoricalAveragesChartProps) {
  const colors = useThemeColors();
  const screenWidth = Dimensions.get('window').width;

  if (readings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No historical data available yet.{'\n'}
          Start recording readings to see averages.
        </Text>
      </View>
    );
  }

  // Calculate averages
  const calculateAverages = (): AverageData => {
    let totalKegSL = 0;
    let totalGrippoSL = 0;
    let totalUvIndex = 0;
    let totalTrackTemp = 0;
    let count = 0;

    readings.forEach(reading => {
      const leftKegSL = parseFloat(reading.leftLane.kegSL) || 0;
      const rightKegSL = parseFloat(reading.rightLane.kegSL) || 0;
      const leftGrippoSL = parseFloat(reading.leftLane.grippoSL) || 0;
      const rightGrippoSL = parseFloat(reading.rightLane.grippoSL) || 0;
      const leftUvIndex = parseFloat(reading.leftLane.uvIndex) || 0;
      const rightUvIndex = parseFloat(reading.rightLane.uvIndex) || 0;
      const leftTrackTemp = parseFloat(reading.leftLane.trackTemp) || 0;
      const rightTrackTemp = parseFloat(reading.rightLane.trackTemp) || 0;

      totalKegSL += (leftKegSL + rightKegSL) / 2;
      totalGrippoSL += (leftGrippoSL + rightGrippoSL) / 2;
      totalUvIndex += (leftUvIndex + rightUvIndex) / 2;
      totalTrackTemp += (leftTrackTemp + rightTrackTemp) / 2;
      count++;
    });

    return {
      kegSL: count > 0 ? totalKegSL / count : 0,
      grippoSL: count > 0 ? totalGrippoSL / count : 0,
      uvIndex: count > 0 ? totalUvIndex / count : 0,
      trackTemp: count > 0 ? totalTrackTemp / count : 0,
      count,
    };
  };

  const averages = calculateAverages();

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  const data = {
    labels: ['Keg SL', 'Grippo SL', 'UV Index', 'Track Temp'],
    datasets: [
      {
        data: [
          averages.kegSL,
          averages.grippoSL,
          averages.uvIndex,
          averages.trackTemp,
        ],
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Historical Averages - {trackName}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Based on {averages.count} reading{averages.count !== 1 ? 's' : ''}
      </Text>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg Keg SL
          </Text>
          <Text style={[styles.statValue, { color: '#007bff' }]}>
            {averages.kegSL.toFixed(1)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg Grippo SL
          </Text>
          <Text style={[styles.statValue, { color: '#28a745' }]}>
            {averages.grippoSL.toFixed(1)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg UV Index
          </Text>
          <Text style={[styles.statValue, { color: '#ffc107' }]}>
            {averages.uvIndex.toFixed(1)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg Track Temp
          </Text>
          <Text style={[styles.statValue, { color: '#dc3545' }]}>
            {averages.trackTemp.toFixed(1)}°F
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={data}
          width={Math.max(screenWidth - 32, 400)}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars
          withInnerLines={true}
          yAxisSuffix=""
          yAxisLabel=""
        />
      </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
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
    lineHeight: 24,
  },
});
