// app/(tabs)/record.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  Modal,
  InputAccessoryView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect, Stack, useRouter } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Track, LaneReading, TrackReading } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';

type WeatherLive = {
  inputs: {
    tempF: number;
    humidityPct: number;
    absPressureInHg: number;
    uvIndex?: number;
  };
  display: {
    ts: string;
    adr: number;
    correction: number;
    uvIndex?: number;
  };
};

async function fetchEliteTrackWeatherSnapshot(): Promise<{
  weather_ts: string;
  temp_f: number;
  humidity_pct: number;
  baro_inhg: number;
  adr: number;
  correction: number;
  davis_uv_index?: number;
}> {
  const res = await fetch('https://elitetrackweather.com/api/live', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

  const json = (await res.json()) as WeatherLive;

  const uv =
    (typeof json.inputs.uvIndex === 'number' ? json.inputs.uvIndex : undefined) ??
    (typeof json.display.uvIndex === 'number' ? json.display.uvIndex : undefined);

  return {
    weather_ts: json.display.ts,
    temp_f: json.inputs.tempF,
    humidity_pct: json.inputs.humidityPct,
    baro_inhg: json.inputs.absPressureInHg,
    adr: json.display.adr,
    correction: json.display.correction,
    davis_uv_index: uv,
  };
}

const INPUT_ACCESSORY_VIEW_ID = 'uniqueKeyboardAccessoryID';

function getEmptyLaneReading(): LaneReading {
  return {
    trackTemp: '',
    uvIndex: '',
    kegSL: '',
    kegOut: '',
    grippoSL: '',
    grippoOut: '',
    shine: '',
    notes: '',
  };
}

const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const trackDateString = (ms: number, timeZone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(ms));

    const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const m = parts.find((p) => p.type === 'month')?.value ?? '00';
    const d = parts.find((p) => p.type === 'day')?.value ?? '00';

    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

const trackTimeString = (ms: number, timeZone: string) => {
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

export default function RecordScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const params = useLocalSearchParams<{ trackId?: string; editReadingId?: string }>();
  const editReadingId = typeof params.editReadingId === 'string' ? params.editReadingId : null;
  const isEditMode = !!editReadingId;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [session, setSession] = useState('');
  const [pair, setPair] = useState('');
  const [leftLane, setLeftLane] = useState<LaneReading>(getEmptyLaneReading());
  const [rightLane, setRightLane] = useState<LaneReading>(getEmptyLaneReading());
  const [existingReading, setExistingReading] = useState<TrackReading | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);

  const loadTracks = useCallback(async () => {
    const allTracks = await SupabaseStorageService.getAllTracks();
    const sorted = allTracks.sort((a, b) => a.name.localeCompare(b.name));
    setTracks(sorted);

    if (!isEditMode && params.trackId && typeof params.trackId === 'string') {
      const t = sorted.find((x) => x.id === params.trackId) ?? null;
      if (t) setSelectedTrack(t);
    }
  }, [params.trackId, isEditMode]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useFocusEffect(
    useCallback(() => {
      loadTracks();
    }, [loadTracks])
  );

  useEffect(() => {
    const run = async () => {
      if (!isEditMode || !editReadingId) return;
      setIsLoadingEdit(true);

      try {
        const r = await SupabaseStorageService.getReadingById(editReadingId);
        if (!r) {
          Alert.alert('Error', 'Could not load reading to edit');
          router.back();
          return;
        }

        setExistingReading(r);
        const tFromTracks = tracks.find((t) => t.id === r.trackId) ?? null;
        setSelectedTrack(tFromTracks ?? selectedTrack ?? null);
        setSession(r.session ?? '');
        setPair(r.pair ?? '');
        setLeftLane({ ...r.leftLane, imageUri: undefined });
        setRightLane({ ...r.rightLane, imageUri: undefined });
      } catch (e) {
        console.error('Edit load error:', e);
        Alert.alert('Error', 'Failed to load reading');
        router.back();
      } finally {
        setIsLoadingEdit(false);
      }
    };

    run();
  }, [isEditMode, editReadingId, tracks, router, selectedTrack]);

  useEffect(() => {
    if (!existingReading) return;
    if (selectedTrack?.id === existingReading.trackId) return;
    const t = tracks.find((x) => x.id === existingReading.trackId) ?? null;
    if (t) setSelectedTrack(t);
  }, [tracks, existingReading, selectedTrack?.id]);

  useEffect(() => {
    if (isEditMode) return;

    setExistingReading(null);
    setSession('');
    setPair('');
    setLeftLane(getEmptyLaneReading());
    setRightLane(getEmptyLaneReading());

    if (params.trackId && typeof params.trackId === 'string') {
      const t = tracks.find((x) => x.id === params.trackId) ?? null;
      setSelectedTrack(t);
    } else {
      setSelectedTrack(null);
    }
  }, [isEditMode, params.trackId, tracks]);

  const handleCancel = () => {
    Keyboard.dismiss();
    router.back();
  };

  const handleSaveReading = async () => {
    if (!selectedTrack) {
      Alert.alert('Error', 'Please select a track');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode && editReadingId) {
        if (!existingReading) {
          Alert.alert('Error', 'Edit state not ready yet');
          return;
        }

        const updates: Partial<TrackReading> = {
          trackId: selectedTrack.id,
          session: session || undefined,
          pair: pair || undefined,
          leftLane: { ...leftLane, imageUri: undefined },
          rightLane: { ...rightLane, imageUri: undefined },
        };

        const ok = await SupabaseStorageService.updateReading(editReadingId, updates);
        if (!ok) {
          Alert.alert('Error', 'Failed to save changes');
          return;
        }

        Alert.alert('Saved', 'Reading updated', [{ text: 'OK', onPress: () => router.back() }]);
        return;
      }

      const ms = Date.now();
      const timeZone = getDeviceTimeZone();
      const trackDate = trackDateString(ms, timeZone);
      const time12Hour = trackTimeString(ms, timeZone);
      const y = Number(trackDate.slice(0, 4));
      const year = Number.isFinite(y) && y > 1900 ? y : new Date(ms).getFullYear();

      let weather: Awaited<ReturnType<typeof fetchEliteTrackWeatherSnapshot>> | null = null;
      try {
        weather = await fetchEliteTrackWeatherSnapshot();
      } catch (e) {
        console.warn('Weather snapshot failed (saving without weather):', e);
      }

      const readingToSave: Omit<TrackReading, 'id'> = {
        trackId: selectedTrack.id,
        date: trackDate,
        time: time12Hour,
        timestamp: ms,
        year,
        session: session || undefined,
        pair: pair || undefined,
        leftLane: { ...leftLane, imageUri: undefined },
        rightLane: { ...rightLane, imageUri: undefined },
        timeZone,
        trackDate,
        ...(weather
          ? {
              weather_ts: weather.weather_ts,
              temp_f: weather.temp_f,
              humidity_pct: weather.humidity_pct,
              baro_inhg: weather.baro_inhg,
              adr: weather.adr,
              correction: weather.correction,
              davis_uv_index: weather.davis_uv_index,
            }
          : {}),
      };

      const savedReading = await SupabaseStorageService.createReading(readingToSave);
      if (!savedReading) {
        Alert.alert('Error', 'Failed to save reading');
        return;
      }

      Alert.alert('Success', 'Reading saved successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error('Save reading exception:', e);
      Alert.alert('Error', 'Failed to save reading');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackDropdown(false);
  };

  const styles = getStyles(colors);

  const renderLaneInputs = (lane: LaneReading, setLane: (lane: LaneReading) => void, title: string) => {
    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Track Temp</Text>
            <TextInput
              style={styles.input}
              value={lane.trackTemp}
              onChangeText={(text) => setLane({ ...lane, trackTemp: text })}
              placeholder="�F"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>UV Index (Manual)</Text>
            <TextInput
              style={styles.input}
              value={lane.uvIndex}
              onChangeText={(text) => setLane({ ...lane, uvIndex: text })}
              placeholder="0-11"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Keg SL</Text>
            <TextInput
              style={styles.input}
              value={lane.kegSL}
              onChangeText={(text) => setLane({ ...lane, kegSL: text })}
              placeholder="Value"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Keg Out</Text>
            <TextInput
              style={styles.input}
              value={lane.kegOut}
              onChangeText={(text) => setLane({ ...lane, kegOut: text })}
              placeholder="Value"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Grippo SL</Text>
            <TextInput
              style={styles.input}
              value={lane.grippoSL}
              onChangeText={(text) => setLane({ ...lane, grippoSL: text })}
              placeholder="Value"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Grippo Out</Text>
            <TextInput
              style={styles.input}
              value={lane.grippoOut}
              onChangeText={(text) => setLane({ ...lane, grippoOut: text })}
              placeholder="Value"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Shine</Text>
          <TextInput
            style={styles.input}
            value={lane.shine}
            onChangeText={(text) => setLane({ ...lane, shine: text })}
            placeholder="Value"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={lane.notes}
            onChangeText={(text) => setLane({ ...lane, notes: text })}
            placeholder="Additional notes..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Reading' : 'Record Reading'}</Text>
          <Text style={styles.headerSubtitle}>Photos live in the Photos tab now.</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.trackSelector}>
            <Text style={styles.sectionTitle}>Select Track</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowTrackDropdown(true)}>
              <Text style={styles.dropdownButtonText}>{selectedTrack ? selectedTrack.name : 'Choose a track...'}</Text>
              <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.sessionPairSection}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Session</Text>
                <TextInput
                  style={styles.input}
                  value={session}
                  onChangeText={setSession}
                  placeholder="Enter session"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pair</Text>
                <TextInput
                  style={styles.input}
                  value={pair}
                  onChangeText={setPair}
                  placeholder="Enter pair"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
                />
              </View>
            </View>
          </View>

          {renderLaneInputs(leftLane, setLeftLane, 'Left Lane')}
          {renderLaneInputs(rightLane, setRightLane, 'Right Lane')}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveReading}
              disabled={isSaving || isLoadingEdit}
            >
              <Text style={styles.saveButtonText}>
                {isLoadingEdit ? 'Loading...' : isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Reading'}
              </Text>
            </TouchableOpacity>
          </View>
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
                {tracks.map((t, idx) => (
                  <TouchableOpacity
                    key={`track-${t.id}-${idx}`}
                    style={[styles.dropdownItem, selectedTrack?.id === t.id && styles.dropdownItemActive]}
                    onPress={() => handleTrackSelect(t)}
                  >
                    <Text style={[styles.dropdownItemText, selectedTrack?.id === t.id && styles.dropdownItemTextActive]}>{t.name}</Text>
                    {selectedTrack?.id === t.id ? (
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.doneButton} onPress={() => Keyboard.dismiss()}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: colors.text },
    headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },

    content: { flex: 1 },
    contentContainer: { padding: 20, paddingBottom: 140 },

    trackSelector: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },

    dropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownButtonText: { fontSize: 16, color: colors.text, fontWeight: '500' },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dropdownModal: { backgroundColor: colors.card, borderRadius: 16, width: '100%', maxHeight: '70%', overflow: 'hidden' },
    dropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
    dropdownList: { maxHeight: 400 },
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
    dropdownItemTextActive: { fontWeight: '600', color: colors.primary },

    sessionPairSection: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    laneSection: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    laneTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notesInput: { height: 80, textAlignVertical: 'top' },

    actions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
    saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

    keyboardAccessory: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      height: 50,
    },
    doneButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 },
    doneButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  });
}
