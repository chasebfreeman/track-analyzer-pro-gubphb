
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useThemeColors } from '@/styles/commonStyles';
import { TrackReading } from '@/types/TrackData';
import { supabase } from '@/utils/supabase';

interface EnhancedDailyChartProps {
  readings: TrackReading[];
  date: string;
  trackId: string;
}

interface WeatherDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  conditions: string;
}

export default function EnhancedDailyChart({ readings, date, trackId }: EnhancedDailyChartProps) {
  const colors = useThemeColors();
  const screenWidth = Dimensions.get('window').width;
  const [weatherData, setWeatherData] = useState<WeatherDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWeatherData();
  }, [trackId, date]);

  const loadWeatherData = async () => {
    console.log('Loading weather data for track:', trackId, 'date:', date);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('track_id', trackId)
        .eq('date', date)
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading weather data:', error);
      } else if (data) {
        setWeatherData(data.map(d => ({
          time: d.time,
          temperature: d.temperature,
          humidity: d.humidity,
          conditions: d.conditions,
        })));
        console.log('Loaded weather data:', data.length, 'entries');
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
    } finally {
      setLoading(false);
    }
  };

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
  const labels = sortedReadings.map(r => r.time.substring(0, 5)); // HH:MM format
  
  const trackTempData = sortedReadings.map(r => {
    const left = parseFloat(r.leftLane.trackTemp) || 0;
    const right = parseFloat(r.rightLane.trackTemp) || 0;
    return (left + right) / 2;
  });

  const uvIndexData = sortedReadings.map(r => {
    const left = parseFloat(r.leftLane.uvIndex) || 0;
    const right = parseFloat(r.rightLane.uvIndex) || 0;
    return (left + right) / 2;
  });

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

  // Match weather data to reading times
  const outsideTempData = sortedReadings.map(r => {
    const readingTime = r.time.substring(0, 5);
    const weatherPoint = weatherData.find(w => w.time.substring(0, 5) === readingTime);
    return weatherPoint?.temperature || null;
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
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  const renderChart = (
    title: string,
    datasets: Array<{ data: (number | null)[]; color: string; label: string }>,
    unit: string
  ) => {
    const chartData = {
      labels: labels,
      datasets: datasets.map(ds => ({
        data: ds.data.map(d => d === null ? 0 : d),
        color: (opacity = 1) => ds.color,
        strokeWidth: 2,
      })),
      legend: datasets.map(ds => ds.label),
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          {title} {unit && `(${unit})`}
        </Text>
        <View style={styles.legendContainer}>
          {datasets.map((ds, index) => (
            <View key={`legend-${index}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ds.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                {ds.label}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(screenWidth - 32, labels.length * 80)}
            height={220}
            chartConfig={chartConfig}
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
        Daily Trend Analysis - {date}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Track conditions throughout the day
      </Text>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading weather data...
          </Text>
        </View>
      )}

      {/* Temperature Comparison Chart */}
      {renderChart(
        'Temperature Trends',
        [
          { data: trackTempData, color: '#dc3545', label: 'Track Temp' },
          ...(weatherData.length > 0 ? [{ data: outsideTempData, color: '#ff8c00', label: 'Outside Temp' }] : []),
        ],
        'Â°F'
      )}

      {/* UV Index Chart */}
      {renderChart('UV Index', [{ data: uvIndexData, color: '#ffc107', label: 'UV Index' }], '')}

      {/* Keg @ Hit Chart */}
      {renderChart('Keg @ Hit', [{ data: kegSLData, color: '#007bff', label: 'Keg @ Hit' }], '')}

      {/* Grippo @ Hit Chart */}
      {renderChart('Grippo @ Hit', [{ data: grippoSLData, color: '#28a745', label: 'Grippo @ Hit' }], '')}

      {weatherData.length === 0 && !loading && (
        <View style={styles.weatherNote}>
          <Text style={[styles.weatherNoteText, { color: colors.textSecondary }]}>
            ðŸ’¡ Tip: Add weather data to see outside temperature trends alongside track temperature
          </Text>
        </View>
      )}
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
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
  weatherNote: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  weatherNoteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

