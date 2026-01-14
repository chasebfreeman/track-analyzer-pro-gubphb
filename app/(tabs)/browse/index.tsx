
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Track, TrackReading, DayReadings } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';

export default function BrowseScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [readings, setReadings] = useState<TrackReading[]>([]);
  const [groupedReadings, setGroupedReadings] = useState<DayReadings[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReadings = useCallback(async (trackId: string, year: number | null) => {
    console.log('Loading readings for track:', trackId, 'year:', year);
    const trackReadings = await SupabaseStorageService.getReadingsForTrack(
      trackId,
      year || undefined
    );
    setReadings(trackReadings);
    
    // Group readings by date
    const grouped: { [date: string]: TrackReading[] } = {};
    trackReadings.forEach((reading) => {
      if (!grouped[reading.date]) {
        grouped[reading.date] = [];
      }
      grouped[reading.date].push(reading);
    });
    
    const dayReadings: DayReadings[] = Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        readings: grouped[date].sort((a, b) => b.timestamp - a.timestamp),
      }));
    
    setGroupedReadings(dayReadings);
    console.log('Grouped readings into', dayReadings.length, 'days');
  }, []);

  const loadTracks = useCallback(async () => {
    console.log('Loading tracks for browse screen');
    const allTracks = await SupabaseStorageService.getAllTracks();
    setTracks(allTracks);
    
    if (allTracks.length > 0 && !selectedTrack) {
      console.log('Auto-selecting first track');
      setSelectedTrack(allTracks[0]);
    }
  }, [selectedTrack]);

  const loadAvailableYears = useCallback(async () => {
    console.log('Loading available years');
    const years = await SupabaseStorageService.getAvailableYears();
    setAvailableYears(years);
    
    if (years.length > 0 && selectedYear === null) {
      console.log('Auto-selecting most recent year:', years[0]);
      setSelectedYear(years[0]);
    }
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      console.log('Browse screen focused');
      loadTracks();
      loadAvailableYears();
    }, [loadTracks, loadAvailableYears])
  );

  useEffect(() => {
    loadTracks();
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedTrack) {
      loadReadings(selectedTrack.id, selectedYear);
    }
  }, [selectedTrack, selectedYear, loadReadings]);

  const handleRefresh = async () => {
    console.log('User pulled to refresh');
    setIsRefreshing(true);
    await loadTracks();
    await loadAvailableYears();
    if (selectedTrack) {
      await loadReadings(selectedTrack.id, selectedYear);
    }
    setIsRefreshing(false);
  };

  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const handleReadingPress = (reading: TrackReading) => {
    console.log('User tapped reading:', reading.id);
    router.push({
      pathname: '/(tabs)/browse/reading-detail',
      params: {
        readingId: reading.id,
        trackId: reading.trackId,
      },
    });
  };

  const toggleDayExpansion = (date: string) => {
    console.log('User toggled day expansion:', date);
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Readings</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.trackSelector}
        contentContainerStyle={styles.trackSelectorContent}
      >
        {tracks.map((track) => (
          <TouchableOpacity
            key={track.id}
            style={[
              styles.trackChip,
              selectedTrack?.id === track.id && styles.trackChipActive,
            ]}
            onPress={() => {
              console.log('User selected track:', track.name);
              setSelectedTrack(track);
            }}
          >
            <Text
              style={[
                styles.trackChipText,
                selectedTrack?.id === track.id && styles.trackChipTextActive,
              ]}
            >
              {track.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.yearFilter}
        contentContainerStyle={styles.yearFilterContent}
      >
        <TouchableOpacity
          style={[styles.yearChip, selectedYear === null && styles.yearChipActive]}
          onPress={() => {
            console.log('User selected All Years filter');
            setSelectedYear(null);
          }}
        >
          <Text style={[styles.yearChipText, selectedYear === null && styles.yearChipTextActive]}>
            All Years
          </Text>
        </TouchableOpacity>
        {availableYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={[styles.yearChip, selectedYear === year && styles.yearChipActive]}
            onPress={() => {
              console.log('User selected year filter:', year);
              setSelectedYear(year);
            }}
          >
            <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.readingsList}
        contentContainerStyle={styles.readingsListContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {groupedReadings.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="doc.text"
              android_material_icon_name="description"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No readings yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Record your first reading in the Record tab
            </Text>
          </View>
        ) : (
          groupedReadings.map((day) => (
            <View key={day.date} style={styles.dayGroup}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => toggleDayExpansion(day.date)}
              >
                <View>
                  <Text style={styles.dayDate}>{formatDateWithDay(day.date)}</Text>
                  <Text style={styles.dayCount}>{day.readings.length} reading(s)</Text>
                </View>
                <IconSymbol
                  ios_icon_name={expandedDays.has(day.date) ? 'chevron.up' : 'chevron.down'}
                  android_material_icon_name={expandedDays.has(day.date) ? 'arrow-upward' : 'arrow-downward'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {expandedDays.has(day.date) && (
                <View style={styles.readingsContainer}>
                  {day.readings.map((reading) => (
                    <TouchableOpacity
                      key={reading.id}
                      style={styles.readingCard}
                      onPress={() => handleReadingPress(reading)}
                    >
                      <View style={styles.readingHeader}>
                        <IconSymbol
                          ios_icon_name="clock"
                          android_material_icon_name="access-time"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.readingTime}>{reading.time}</Text>
                      </View>
                      <View style={styles.readingData}>
                        <Text style={styles.readingDataText}>
                          Left: {reading.leftLane.trackTemp}°F, UV {reading.leftLane.uvIndex}
                        </Text>
                        <Text style={styles.readingDataText}>
                          Right: {reading.rightLane.trackTemp}°F, UV {reading.rightLane.uvIndex}
                        </Text>
                      </View>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="arrow-forward"
                        size={16}
                        color={colors.textSecondary}
                        style={styles.readingChevron}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? 48 : 0,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
    },
    trackSelector: {
      maxHeight: 50,
      marginBottom: 12,
    },
    trackSelectorContent: {
      paddingHorizontal: 20,
      gap: 8,
    },
    trackChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trackChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    trackChipText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    trackChipTextActive: {
      color: '#FFFFFF',
    },
    yearFilter: {
      maxHeight: 50,
      marginBottom: 16,
    },
    yearFilterContent: {
      paddingHorizontal: 20,
      gap: 8,
    },
    yearChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    yearChipText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    yearChipTextActive: {
      color: '#FFFFFF',
    },
    readingsList: {
      flex: 1,
    },
    readingsListContent: {
      padding: 20,
    },
    dayGroup: {
      marginBottom: 16,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
    },
    dayDate: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    dayCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    readingsContainer: {
      marginTop: 8,
      gap: 8,
    },
    readingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    readingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    readingTime: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
    },
    readingData: {
      gap: 4,
    },
    readingDataText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    readingChevron: {
      position: 'absolute',
      right: 16,
      top: '50%',
      marginTop: -8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });
}
