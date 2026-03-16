import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import GraphBuilderCard from '@/components/GraphBuilderCard';
import GraphPointDetailsSheet from '@/components/GraphPointDetailsSheet';
import ScatterPlotView from '@/components/ScatterPlotView';
import { DayReadings, Track, TrackReading } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import { buildGraphPoints } from '@/utils/graphData';
import { GraphFieldId, GraphLaneFilter, GraphPoint, getGraphFieldLabel } from '@/utils/graphFields';

type BrowseMode = 'readings' | 'graphs';

export default function BrowseScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [mode, setMode] = useState<BrowseMode>('readings');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [readings, setReadings] = useState<TrackReading[]>([]);
  const [groupedReadings, setGroupedReadings] = useState<DayReadings[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);
  const [xField, setXField] = useState<GraphFieldId>('trackTemp');
  const [yField, setYField] = useState<GraphFieldId>('grippoSL');
  const [laneFilter, setLaneFilter] = useState<GraphLaneFilter>('both');
  const [selectedPoint, setSelectedPoint] = useState<GraphPoint | null>(null);

  const localDateKeyFromTimestamp = (ms: number) => {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatTimeInTimeZone = (ms: number, timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(ms));
    } catch {
      const d = new Date(ms);
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  };

  const formatDateWithDay = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getDayKey = (reading: TrackReading) => reading.trackDate || reading.date || localDateKeyFromTimestamp(reading.timestamp);

  const getDisplayTime = (reading: TrackReading) => {
    if (reading.timeZone && reading.timestamp) return formatTimeInTimeZone(reading.timestamp, reading.timeZone);
    return reading.time;
  };

  const loadReadings = useCallback(async (trackId: string, year: number | null) => {
    const trackReadings = await SupabaseStorageService.getReadingsForTrack(trackId, year || undefined);
    setReadings(trackReadings);

    const grouped: Record<string, TrackReading[]> = {};
    trackReadings.forEach((reading) => {
      const key = getDayKey(reading);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(reading);
    });

    const dayReadings: DayReadings[] = Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        readings: grouped[date].sort((a, b) => b.timestamp - a.timestamp),
      }));

    setGroupedReadings(dayReadings);
  }, []);

  const loadTracks = useCallback(async () => {
    const allTracks = await SupabaseStorageService.getAllTracks();
    setTracks(allTracks);

    if (allTracks.length > 0 && !selectedTrack) {
      setSelectedTrack(allTracks[0]);
    }
  }, [selectedTrack]);

  const loadAvailableYears = useCallback(async () => {
    const years = await SupabaseStorageService.getAvailableYears(selectedTrack?.id);
    setAvailableYears(years);
    if (years.length > 0 && selectedYear === null) setSelectedYear(years[0]);
  }, [selectedTrack?.id, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      loadTracks();
      loadAvailableYears();
      if (selectedTrack) loadReadings(selectedTrack.id, selectedYear);
    }, [loadTracks, loadAvailableYears, loadReadings, selectedTrack, selectedYear])
  );

  useEffect(() => {
    loadTracks();
    loadAvailableYears();
  }, [loadTracks, loadAvailableYears]);

  useEffect(() => {
    if (selectedTrack) {
      loadReadings(selectedTrack.id, selectedYear);
    }
  }, [selectedTrack, selectedYear, loadReadings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadTracks();
      await loadAvailableYears();
      if (selectedTrack) await loadReadings(selectedTrack.id, selectedYear);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackDropdown(false);
    setSelectedYear(null);
    setSelectedPoint(null);
  };

  const handleReadingPress = (reading: TrackReading) => {
    router.push({
      pathname: '/(tabs)/browse/reading-detail',
      params: { readingId: reading.id, trackId: reading.trackId },
    });
  };

  const handleOpenPointReading = (point: GraphPoint) => {
    setSelectedPoint(null);
    handleReadingPress(point.reading);
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const graphPoints = useMemo(
    () => buildGraphPoints({ readings, laneFilter, xField, yField }),
    [readings, laneFilter, xField, yField]
  );

  const summaryText = selectedTrack
    ? `${selectedTrack.name} • ${selectedYear === null ? 'All Years' : selectedYear}`
    : 'Choose a track to start exploring';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Browse</Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'readings' ? 'Open saved runs and compare the day.' : 'Plot any two numeric fields against each other.'}
          </Text>
        </View>

        <View style={styles.modeSwitcher}>
          {([
            ['readings', 'Readings'],
            ['graphs', 'Graphs'],
          ] as const).map(([value, label]) => {
            const active = mode === value;
            return (
              <TouchableOpacity key={value} style={[styles.modeButton, active && styles.modeButtonActive]} onPress={() => setMode(value)}>
                <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearFilter} contentContainerStyle={styles.yearFilterContent}>
          <TouchableOpacity style={[styles.yearChip, selectedYear === null && styles.yearChipActive]} onPress={() => setSelectedYear(null)}>
            <Text style={[styles.yearChipText, selectedYear === null && styles.yearChipTextActive]}>All Years</Text>
          </TouchableOpacity>

          {availableYears.map((year) => (
            <TouchableOpacity
              key={`year-${year}`}
              style={[styles.yearChip, selectedYear === year && styles.yearChipActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.trackSelector}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowTrackDropdown(true)}>
            <View>
              <Text style={styles.dropdownButtonLabel}>Track</Text>
              <Text style={styles.dropdownButtonText}>{selectedTrack ? selectedTrack.name : 'Choose a track...'}</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.selectorSummary}>{summaryText}</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          {mode === 'readings' ? (
            groupedReadings.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No readings yet</Text>
                <Text style={styles.emptyStateSubtext}>Record your first reading in the Record tab.</Text>
              </View>
            ) : (
              groupedReadings.map((day) => (
                <View key={day.date} style={styles.dayGroup}>
                  <TouchableOpacity style={styles.dayHeader} onPress={() => toggleDayExpansion(day.date)}>
                    <View>
                      <Text style={styles.dayDate}>{formatDateWithDay(day.date)}</Text>
                      <Text style={styles.dayCount}>{day.readings.length} reading(s)</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name={expandedDays.has(day.date) ? 'chevron.up' : 'chevron.down'}
                      android_material_icon_name={expandedDays.has(day.date) ? 'arrow-drop-up' : 'arrow-drop-down'}
                      size={24}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {expandedDays.has(day.date) ? (
                    <View style={styles.readingsContainer}>
                      {day.readings.map((reading) => (
                        <TouchableOpacity key={reading.id} style={styles.readingCard} onPress={() => handleReadingPress(reading)}>
                          <View style={styles.readingHeader}>
                            <View>
                              <Text style={styles.readingTime}>{getDisplayTime(reading)}</Text>
                              <Text style={styles.readingMeta}>{reading.session ? `Session ${reading.session}` : 'Tap for details'}</Text>
                            </View>
                            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={18} color={colors.textSecondary} />
                          </View>

                          <View style={styles.readingData}>
                            <Text style={styles.readingDataText}>Left: {reading.leftLane.trackTemp || 'N/A'} F, UV {reading.leftLane.uvIndex || 'N/A'}</Text>
                            <Text style={styles.readingDataText}>Right: {reading.rightLane.trackTemp || 'N/A'} F, UV {reading.rightLane.uvIndex || 'N/A'}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))
            )
          ) : (
            <>
              <GraphBuilderCard
                xField={xField}
                yField={yField}
                laneFilter={laneFilter}
                onChangeXField={setXField}
                onChangeYField={setYField}
                onChangeLaneFilter={setLaneFilter}
                onSwapAxes={() => {
                  const prevX = xField;
                  setXField(yField);
                  setYField(prevX);
                }}
              />

              <View style={styles.graphSummaryCard}>
                <Text style={styles.graphSummaryTitle}>Current View</Text>
                <Text style={styles.graphSummaryText}>
                  {getGraphFieldLabel(yField)} plotted against {getGraphFieldLabel(xField)} using {laneFilter === 'both' ? 'both lanes' : `${laneFilter} lane`}.
                </Text>
                <Text style={styles.graphSummaryCount}>{graphPoints.length} point(s) available</Text>
              </View>

              <ScatterPlotView points={graphPoints} xLabel={getGraphFieldLabel(xField)} yLabel={getGraphFieldLabel(yField)} onSelectPoint={setSelectedPoint} />
            </>
          )}
        </ScrollView>

        <Modal visible={showTrackDropdown} transparent animationType="fade" onRequestClose={() => setShowTrackDropdown(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTrackDropdown(false)}>
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Track</Text>
                <TouchableOpacity onPress={() => setShowTrackDropdown(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.dropdownList}>
                {tracks.map((track) => (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.dropdownItem, selectedTrack?.id === track.id && styles.dropdownItemActive]}
                    onPress={() => handleTrackSelect(track)}
                  >
                    <Text style={[styles.dropdownItemText, selectedTrack?.id === track.id && styles.dropdownItemTextActive]}>{track.name}</Text>
                    {selectedTrack?.id === track.id ? (
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <GraphPointDetailsSheet point={selectedPoint} visible={!!selectedPoint} onClose={() => setSelectedPoint(null)} onOpenReading={handleOpenPointReading} />
      </SafeAreaView>
    </>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: colors.text },
    headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
    modeSwitcher: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 6,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeButton: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    modeButtonActive: { backgroundColor: colors.primary },
    modeButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: 15 },
    modeButtonTextActive: { color: '#FFFFFF' },
    yearFilter: { maxHeight: 48, marginBottom: 12 },
    yearFilterContent: { paddingHorizontal: 20, gap: 8 },
    yearChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    yearChipText: { color: colors.text, fontWeight: '600' },
    yearChipTextActive: { color: '#FFFFFF' },
    trackSelector: { paddingHorizontal: 20, marginBottom: 12 },
    dropdownButton: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    dropdownButtonLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 2 },
    dropdownButtonText: { fontSize: 16, color: colors.text, fontWeight: '600' },
    selectorSummary: { marginTop: 8, fontSize: 13, color: colors.textSecondary },
    content: { flex: 1 },
    contentContainer: { paddingHorizontal: 20, paddingBottom: 140 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
    emptyStateText: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
    emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
    dayGroup: { marginBottom: 16 },
    dayHeader: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayDate: { fontSize: 16, fontWeight: '700', color: colors.text },
    dayCount: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    readingsContainer: { marginTop: 10, gap: 10 },
    readingCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    readingTime: { fontSize: 16, fontWeight: '700', color: colors.text },
    readingMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    readingData: { gap: 4 },
    readingDataText: { fontSize: 14, color: colors.textSecondary },
    graphSummaryCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    graphSummaryTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    graphSummaryText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    graphSummaryCount: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 10 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dropdownModal: { backgroundColor: colors.card, borderRadius: 18, width: '100%', maxHeight: '70%', overflow: 'hidden' },
    dropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    dropdownList: { maxHeight: 420 },
    dropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemActive: { backgroundColor: colors.background },
    dropdownItemText: { fontSize: 16, color: colors.text },
    dropdownItemTextActive: { fontWeight: '700', color: colors.primary },
  });
}
