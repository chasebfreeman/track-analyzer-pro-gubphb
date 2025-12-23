
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import { Track, TrackReading, DayReadings } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';
import DailyReadingChart from '@/components/DailyReadingChart';
import HistoricalAveragesChart from '@/components/HistoricalAveragesChart';

export default function BrowseScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [readings, setReadings] = useState<TrackReading[]>([]);
  const [allTrackReadings, setAllTrackReadings] = useState<TrackReading[]>([]);
  const [groupedReadings, setGroupedReadings] = useState<DayReadings[]>([]);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showHistoricalAverages, setShowHistoricalAverages] = useState(false);

  useEffect(() => {
    loadTracks();
    loadAllAvailableYears();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Browse screen focused, reloading data');
      loadTracks();
      loadAllAvailableYears();
    }, [])
  );

  useEffect(() => {
    if (selectedTrack) {
      loadReadings(selectedTrack.id, selectedYear);
      loadAllTrackReadings(selectedTrack.id);
    }
  }, [selectedTrack, selectedYear]);

  useEffect(() => {
    filterTracksByYear();
  }, [selectedYear, allTracks]);

  const loadTracks = async () => {
    console.log('Loading tracks in BrowseScreen...');
    const loadedTracks = await SupabaseStorageService.getTracks();
    console.log('Loaded tracks:', loadedTracks.length);
    setAllTracks(loadedTracks.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const filterTracksByYear = async () => {
    console.log('Filtering tracks for year:', selectedYear);
    const tracksWithReadings: Track[] = [];
    
    for (const track of allTracks) {
      const trackReadings = await SupabaseStorageService.getReadingsByTrackAndYear(track.id, selectedYear);
      if (trackReadings.length > 0) {
        tracksWithReadings.push(track);
      }
    }
    
    console.log('Tracks with readings for', selectedYear, ':', tracksWithReadings.length);
    setFilteredTracks(tracksWithReadings);
    
    if (selectedTrack && !tracksWithReadings.find(t => t.id === selectedTrack.id)) {
      console.log('Selected track not in filtered list, resetting selection');
      setSelectedTrack(tracksWithReadings.length > 0 ? tracksWithReadings[0] : null);
    } else if (!selectedTrack && tracksWithReadings.length > 0) {
      setSelectedTrack(tracksWithReadings[0]);
    }
  };

  const loadAllAvailableYears = async () => {
    try {
      const years = await SupabaseStorageService.getAvailableYears();
      const currentYear = new Date().getFullYear();
      
      const allYears = new Set<number>();
      
      years.forEach(year => allYears.add(year));
      
      allYears.add(2024);
      allYears.add(2025);
      allYears.add(currentYear);
      allYears.add(currentYear + 1);
      
      const sortedYears = Array.from(allYears).sort((a, b) => b - a);
      
      console.log('Available years:', sortedYears);
      setAvailableYears(sortedYears);
    } catch (error) {
      console.error('Error loading available years:', error);
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear + 1, currentYear, 2025, 2024].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a));
    }
  };

  const loadReadings = async (trackId: string, year: number) => {
    console.log('Loading readings for track:', trackId, 'year:', year);
    const trackReadings = await SupabaseStorageService.getReadingsByTrackAndYear(trackId, year);
    console.log('Found readings:', trackReadings.length);
    const sorted = trackReadings.sort((a, b) => b.timestamp - a.timestamp);
    setReadings(sorted);

    const grouped: { [key: string]: TrackReading[] } = {};
    sorted.forEach((reading) => {
      if (!grouped[reading.date]) {
        grouped[reading.date] = [];
      }
      grouped[reading.date].push(reading);
    });

    const groupedArray: DayReadings[] = Object.keys(grouped).map((date) => ({
      date,
      readings: grouped[date],
    }));

    setGroupedReadings(groupedArray);
  };

  const loadAllTrackReadings = async (trackId: string) => {
    console.log('Loading all readings for track:', trackId);
    const trackReadings = await SupabaseStorageService.getReadingsByTrack(trackId);
    console.log('Found all readings:', trackReadings.length);
    setAllTrackReadings(trackReadings);
  };

  const formatDateWithDay = (dateString: string): string => {
    try {
      const [month, day, year] = dateString.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      return `${dateString} - ${dayName}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const handleReadingPress = (reading: TrackReading) => {
    console.log('Reading pressed:', reading.id);
    try {
      router.push({
        pathname: '/(tabs)/browse/reading-detail',
        params: { readingId: reading.id },
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Browse Data</Text>

        <View style={styles.yearSelector}>
          <Text style={styles.label}>Select Year</Text>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => setShowYearPicker(!showYearPicker)}
            activeOpacity={0.7}
          >
            <Text style={styles.yearButtonText}>{selectedYear}</Text>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name={showYearPicker ? 'expand_less' : 'expand_more'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>

          {showYearPicker && (
            <View style={styles.yearList}>
              {availableYears.length === 0 ? (
                <Text style={styles.noYearsText}>
                  No data available yet. Start recording to see years here.
                </Text>
              ) : (
                availableYears.map((year, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={[
                        styles.yearOption,
                        selectedYear === year && styles.yearOptionSelected,
                      ]}
                      onPress={() => {
                        console.log('Year selected:', year);
                        setSelectedYear(year);
                        setShowYearPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          selectedYear === year && styles.yearOptionTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.trackSelector}>
          <Text style={styles.label}>Select Track</Text>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => setShowTrackPicker(!showTrackPicker)}
          >
            <Text style={styles.trackButtonText}>
              {selectedTrack ? selectedTrack.name : filteredTracks.length === 0 ? 'No tracks with data for this year' : 'Choose a track...'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name={showTrackPicker ? 'expand_less' : 'expand_more'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showTrackPicker && (
            <View style={styles.trackList}>
              {filteredTracks.length === 0 ? (
                <Text style={styles.noTracksText}>
                  No tracks have readings for {selectedYear}.{'\n'}
                  Select a different year or start recording data.
                </Text>
              ) : (
                filteredTracks.map((track, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={[
                        styles.trackOption,
                        selectedTrack?.id === track.id && styles.trackOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedTrack(track);
                        setShowTrackPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.trackOptionText,
                          selectedTrack?.id === track.id && styles.trackOptionTextSelected,
                        ]}
                      >
                        {track.name}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </View>
          )}
        </View>

        {selectedTrack && allTrackReadings.length > 0 && (
          <TouchableOpacity
            style={styles.historicalButton}
            onPress={() => setShowHistoricalAverages(!showHistoricalAverages)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="chart.bar"
              android_material_icon_name="bar_chart"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.historicalButtonText}>
              {showHistoricalAverages ? 'Hide' : 'Show'} Historical Averages
            </Text>
          </TouchableOpacity>
        )}

        {showHistoricalAverages && selectedTrack && (
          <View style={styles.historicalSection}>
            <HistoricalAveragesChart
              readings={allTrackReadings}
              trackName={selectedTrack.name}
            />
          </View>
        )}

        {readings.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {filteredTracks.length === 0 
                ? `No tracks have readings for ${selectedYear}.${'\n'}Select a different year or start recording data.`
                : `No readings yet for ${selectedYear}.${'\n'}Start recording data to see it here!`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.readingsList}>
            {groupedReadings.map((dayGroup, dayIndex) => (
              <React.Fragment key={dayIndex}>
                <View style={styles.daySection}>
                  <TouchableOpacity
                    style={styles.dayHeaderContainer}
                    onPress={() => toggleDayExpansion(dayGroup.date)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dayHeader}>
                      {formatDateWithDay(dayGroup.date)}
                    </Text>
                    <IconSymbol
                      ios_icon_name={expandedDay === dayGroup.date ? 'chart.line.uptrend.xyaxis' : 'chart.bar'}
                      android_material_icon_name={expandedDay === dayGroup.date ? 'show_chart' : 'bar_chart'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {expandedDay === dayGroup.date && (
                    <View style={styles.chartSection}>
                      <DailyReadingChart
                        readings={dayGroup.readings}
                        date={dayGroup.date}
                      />
                    </View>
                  )}

                  {dayGroup.readings.map((reading, readingIndex) => (
                    <React.Fragment key={readingIndex}>
                      <TouchableOpacity
                        style={styles.readingCard}
                        onPress={() => handleReadingPress(reading)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.readingHeader}>
                          <View style={styles.readingHeaderLeft}>
                            <IconSymbol
                              ios_icon_name="clock"
                              android_material_icon_name="access_time"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.readingTime}>
                              {reading.time}
                            </Text>
                          </View>
                          <IconSymbol
                            ios_icon_name="chevron.right"
                            android_material_icon_name="chevron_right"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </View>
                        <View style={styles.readingPreview}>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Left Lane Temp:</Text>
                            <Text style={styles.previewValue}>
                              {reading.leftLane.trackTemp || 'N/A'}°F
                            </Text>
                          </View>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Right Lane Temp:</Text>
                            <Text style={styles.previewValue}>
                              {reading.rightLane.trackTemp || 'N/A'}°F
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </React.Fragment>
            ))}
          </View>
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
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'android' ? 48 : 60,
      paddingHorizontal: 16,
      paddingBottom: 120,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 20,
      color: colors.text,
    },
    yearSelector: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    yearButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    yearButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    yearList: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    yearOption: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    yearOptionSelected: {
      backgroundColor: colors.primary,
    },
    yearOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    yearOptionTextSelected: {
      color: '#ffffff',
    },
    noYearsText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
      color: colors.textSecondary,
    },
    trackSelector: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    trackButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    trackButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    trackList: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    trackOption: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    trackOptionSelected: {
      backgroundColor: colors.primary,
    },
    trackOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    trackOptionTextSelected: {
      color: '#ffffff',
    },
    noTracksText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    historicalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    historicalButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    historicalSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 16,
      paddingHorizontal: 40,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    readingsList: {
      gap: 20,
    },
    daySection: {
      marginBottom: 12,
    },
    dayHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 8,
    },
    dayHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    chartSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    readingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    readingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    readingHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    readingTime: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    readingPreview: {
      gap: 6,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    previewLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    previewValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
