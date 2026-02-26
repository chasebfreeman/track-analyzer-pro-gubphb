// app/(tabs)/record.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
type WeatherLive = {
  inputs: {
    tempF: number;
    humidityPct: number;
    absPressureInHg: number;
  };
  display: {
    ts: string;
    adr: number;
    correction: number;
  };
};

async function fetchEliteTrackWeatherSnapshot() {
  const res = await fetch("https://elitetrackweather.com/api/live", {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

  const json = (await res.json()) as WeatherLive;

  return {
    weather_ts: json.display.ts,
    temp_f: json.inputs.tempF,
    humidity_pct: json.inputs.humidityPct,
    baro_inhg: json.inputs.absPressureInHg,
    adr: json.display.adr,
    correction: json.display.correction,
  };
}


const INPUT_ACCESSORY_VIEW_ID = 'uniqueKeyboardAccessoryID';

export default function RecordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ editReadingId?: string; trackId?: string }>();

  const editReadingId =
    typeof params.editReadingId === 'string' && params.editReadingId.length > 0
     ? params.editReadingId
      : null;

  const isEditing = useMemo(() => !!editReadingId, [editReadingId]);
  const hasHydratedRef = useRef(false);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [session, setSession] = useState('');
  const [pair, setPair] = useState('');
  const [leftLane, setLeftLane] = useState<LaneReading>(getEmptyLaneReading());
  const [rightLane, setRightLane] = useState<LaneReading>(getEmptyLaneReading());
  const [isSaving, setIsSaving] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);

  // NEW: image action modal
  const [showImageActions, setShowImageActions] = useState(false);
  const [imageLaneTarget, setImageLaneTarget] = useState<'left' | 'right' | null>(null);

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
      imageUri: undefined,
    };
  }


  // ✅ Track-local forever: best-effort timezone
  const getDeviceTimeZone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  };

  // ✅ Get YYYY-MM-DD for a specific timezone from a timestamp (safe)
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

  // ✅ Track-local time string from timestamp + IANA timezone (no seconds)
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

  const loadTracks = useCallback(async () => {
    console.log('Loading tracks for record screen');
    const allTracks = await SupabaseStorageService.getAllTracks();
    const sortedTracks = allTracks.sort((a, b) => a.name.localeCompare(b.name));
    setTracks(sortedTracks);

    if (params.trackId && typeof params.trackId === 'string') {
      const track = sortedTracks.find((t) => t.id === params.trackId);
      if (track) {
        console.log('Auto-selecting track from params:', track.name);
        setSelectedTrack(track);
      }
    }
  }, [params.trackId]);

  useFocusEffect(
    useCallback(() => {
      console.log('Record screen focused');
      loadTracks();
    }, [loadTracks])
  );

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);
  
useEffect(() => {
  let cancelled = false;

  async function loadExistingReading() {
    if (!editReadingId) return;
    if (hasHydratedRef.current) return;

    try {
      console.log("Loading existing reading for edit:", editReadingId);

      // You need this method in SupabaseStorageService:
      // getReadingById(readingId: string): Promise<TrackReading | null>
      const existing = await SupabaseStorageService.getReadingById(editReadingId);

      if (cancelled) return;

      if (!existing) {
        Alert.alert("Not found", "Could not load that reading to edit.");
        return;
      }

      // ✅ Pre-fill the form fields
      setSession(existing.session ?? "");
      setPair(existing.pair ?? "");
      setLeftLane(existing.leftLane ?? getEmptyLaneReading());
      setRightLane(existing.rightLane ?? getEmptyLaneReading());

      // ✅ Ensure the track is selected if it exists
      const track = tracks.find((t) => t.id === existing.trackId) ?? null;
      if (track) setSelectedTrack(track);

      hasHydratedRef.current = true;
      console.log("Hydrated record form for edit:", editReadingId);
    } catch (e: any) {
      console.error("Failed to load reading for edit:", e);
      Alert.alert("Error", e?.message ?? "Failed to load reading for edit.");
    }
  }

  loadExistingReading();

  return () => {
    cancelled = true;
  };
}, [editReadingId, tracks]);

  const setLaneImage = (lane: 'left' | 'right', uri: string) => {
    if (lane === 'left') setLeftLane({ ...leftLane, imageUri: uri });
    else setRightLane({ ...rightLane, imageUri: uri });
  };

  // NEW: open actions modal (camera or library)
  const openImageActions = (lane: 'left' | 'right') => {
    setImageLaneTarget(lane);
    setShowImageActions(true);
  };

  const pickFromLibrary = async () => {
    const lane = imageLaneTarget;
    setShowImageActions(false);
    if (!lane) return;

    console.log('Pick image from library for', lane);

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('Image selected:', result.assets[0].uri);
      setLaneImage(lane, result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const lane = imageLaneTarget;
    setShowImageActions(false);
    if (!lane) return;

    console.log('Take photo for', lane);

    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('Photo captured:', result.assets[0].uri);
      setLaneImage(lane, result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    const lane = imageLaneTarget;
    setShowImageActions(false);
    if (!lane) return;

    if (lane === 'left') setLeftLane({ ...leftLane, imageUri: undefined });
    else setRightLane({ ...rightLane, imageUri: undefined });
  };

  const handleSaveReading = async () => {
  console.log('User tapped Save Reading button');

  if (!selectedTrack) {
    Alert.alert('Error', 'Please select a track');
    return;
  }

  setIsSaving(true);

  try {
// 🔒 If editing, fetch existing reading ONCE
let existing: TrackReading | null = null;

if (editReadingId) {
  existing = await SupabaseStorageService.getReadingById(editReadingId);

  if (!existing) {
    Alert.alert('Error', 'Could not load existing reading');
    return;
  }
}

// 🕒 Default to "new reading" values
let ms = Date.now();
let timeZone = getDeviceTimeZone();
let trackDate = trackDateString(ms, timeZone);
let time12Hour = trackTimeString(ms, timeZone);

let y = Number(trackDate.slice(0, 4));
let year = Number.isFinite(y) && y > 1900 ? y : new Date(ms).getFullYear();

// 🔒 If editing, preserve original identity fields
if (existing) {
  ms = existing.timestamp;
  timeZone = existing.timeZone ?? timeZone;
  trackDate = existing.trackDate ?? existing.date ?? trackDate;
  time12Hour = existing.time ?? time12Hour;
  year = existing.year ?? year;
}

// 🌤 Weather handling
let weather: {
  weather_ts?: string;
  temp_f?: number;
  humidity_pct?: number;
  baro_inhg?: number;
  adr?: number;
  correction?: number;
} | null = null;

if (existing) {
  // 🔒 Preserve original weather snapshot
  weather = {
    weather_ts: existing.weather_ts,
    temp_f: existing.temp_f,
    humidity_pct: existing.humidity_pct,
    baro_inhg: existing.baro_inhg,
    adr: existing.adr,
    correction: existing.correction,
  };
} else {
  // 🆕 New reading → fetch live weather
  try {
    weather = await fetchEliteTrackWeatherSnapshot();
  } catch (e) {
    console.warn('Weather snapshot failed (saving reading without weather):', e);
  }
}

    const reading: Omit<TrackReading, 'id'> = {
     trackId: selectedTrack.id,
     date: trackDate,
     time: time12Hour,
     timestamp: ms,
    year,
    session: session || undefined,
    pair: pair || undefined,
    leftLane,
    rightLane,
    timeZone,
    trackDate,
  ...(weather ? {
      temp_f: weather.temp_f,
      humidity_pct: weather.humidity_pct,
     baro_inhg: weather.baro_inhg,
     adr: weather.adr,
     correction: weather.correction,
     weather_ts: weather.weather_ts,
  } : {}),
};

    console.log('Saving new reading:', reading);

    // (keep your existing insert code below this)
// 1) create or update reading row first
let savedReadingId: string | null = null;

if (editReadingId) {
  console.log('Updating existing reading:', editReadingId);

  const updated = await SupabaseStorageService.updateReading(editReadingId, reading);

  if (!updated) {
    Alert.alert('Error', 'Failed to update reading');
    return;
}

  savedReadingId = updated.id; // same as editReadingId, but now type-safe
} else {
  console.log('Creating new reading');

  const saved = await SupabaseStorageService.createReading(reading);

  if (!saved) {
    Alert.alert('Error', 'Failed to save reading');
    return;
  }

  savedReadingId = saved.id;
}

if (!savedReadingId) {
  Alert.alert('Error', 'Failed to determine saved reading id');
  return;
}

console.log('Saved reading id:', savedReadingId);

// 2) upload photos (if any)
const isLocalFileUri = (uri: string) =>
  uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');

let leftPath: string | null = null;
let rightPath: string | null = null;

const leftUri = leftLane.imageUri;
if (leftUri && isLocalFileUri(leftUri)) {
  leftPath = await SupabaseStorageService.uploadImage(leftUri, savedReadingId, 'left');
}

const rightUri = rightLane.imageUri;
if (rightUri && isLocalFileUri(rightUri)) {
  rightPath = await SupabaseStorageService.uploadImage(rightUri, savedReadingId, 'right');
}

// 3) store paths on the reading row
if (leftPath || rightPath) {
  await SupabaseStorageService.updateReadingPhotoPaths({
    readingId: savedReadingId,
    leftPhotoPath: leftPath ?? undefined,
    rightPhotoPath: rightPath ?? undefined,
  });
}

// 4) success UI
Alert.alert('Success', 'Reading saved successfully', [
  {
    text: 'OK',
    onPress: () => {
      if (editReadingId) {
        router.back();
        return;
      }

      setLeftLane(getEmptyLaneReading());
      setRightLane(getEmptyLaneReading());
      setSession('');
      setPair('');
      Keyboard.dismiss();
    },
  },
]);
    
  } catch (e) {
    console.error('Save reading exception:', e);
    Alert.alert('Error', 'Failed to save reading');
  } finally {
    setIsSaving(false);
  }
};

  const handleCancel = () => {
    console.log('User tapped Cancel button');
    setLeftLane(getEmptyLaneReading());
    setRightLane(getEmptyLaneReading());
    setSession('');
    setPair('');
    Keyboard.dismiss();
  };

  const handleTrackSelect = (track: Track) => {
    console.log('User selected track:', track.name);
    setSelectedTrack(track);
    setShowTrackDropdown(false);
  };

  const renderLaneInputs = (
    lane: LaneReading,
    setLane: (lane: LaneReading) => void,
    title: string,
    laneType: 'left' | 'right'
  ) => {
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
              placeholder="°F"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>UV Index</Text>
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
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
            {...(Platform.OS === 'ios' && { inputAccessoryViewID: INPUT_ACCESSORY_VIEW_ID })}
          />
        </View>

        <TouchableOpacity style={styles.imageButton} onPress={() => openImageActions(laneType)}>
          <IconSymbol ios_icon_name="camera" android_material_icon_name="camera" size={24} color={colors.primary} />
          <Text style={styles.imageButtonText}>{lane.imageUri ? 'Photo Options' : 'Add Photo'}</Text>
        </TouchableOpacity>

        {lane.imageUri && <Image source={{ uri: lane.imageUri }} style={styles.previewImage} />}
      </View>
    );
  };

  const styles = getStyles(colors);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Reading' : 'Record Reading'}
</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.trackSelector}>
            <Text style={styles.sectionTitle}>Select Track</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                console.log('User tapped track dropdown');
                setShowTrackDropdown(true);
              }}
            >
              <Text style={styles.dropdownButtonText}>{selectedTrack ? selectedTrack.name : 'Choose a track...'}</Text>
              <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedTrack && (
            <>
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

              {renderLaneInputs(leftLane, setLeftLane, 'Left Lane', 'left')}
              {renderLaneInputs(rightLane, setRightLane, 'Right Lane', 'right')}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isSaving}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSaveReading}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Reading'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Track dropdown modal */}
        <Modal
          visible={showTrackDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTrackDropdown(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTrackDropdown(false)}>
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Track</Text>
                <TouchableOpacity onPress={() => setShowTrackDropdown(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.dropdownList}>
                {tracks.map((track, index) => (
                  <TouchableOpacity
                    key={`track-dropdown-${track.id}-${index}`}
                    style={[styles.dropdownItem, selectedTrack?.id === track.id && styles.dropdownItemActive]}
                    onPress={() => handleTrackSelect(track)}
                  >
                    <Text style={[styles.dropdownItemText, selectedTrack?.id === track.id && styles.dropdownItemTextActive]}>
                      {track.name}
                    </Text>
                    {selectedTrack?.id === track.id && (
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* NEW: Image actions modal */}
        <Modal
          visible={showImageActions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageActions(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowImageActions(false)}>
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Photo</Text>
                <TouchableOpacity onPress={() => setShowImageActions(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 16, gap: 12 }}>
                <TouchableOpacity style={styles.actionRow} onPress={takePhoto}>
                  <IconSymbol ios_icon_name="camera" android_material_icon_name="photo-camera" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionRow} onPress={pickFromLibrary}>
                  <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Choose from Library</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionRow} onPress={removePhoto}>
                  <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Remove Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                console.log('User tapped Done button on keyboard');
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 140,
    },
    trackSelector: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
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
    dropdownButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dropdownModal: {
      backgroundColor: colors.card,
      borderRadius: 16,
      width: '100%',
      maxHeight: '70%',
      overflow: 'hidden',
    },
    dropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    dropdownList: {
      maxHeight: 400,
    },
    dropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemActive: {
      backgroundColor: colors.background,
    },
    dropdownItemText: {
      fontSize: 16,
      color: colors.text,
    },
    dropdownItemTextActive: {
      fontWeight: '600',
      color: colors.primary,
    },
    sessionPairSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    laneSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    laneTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    inputGroup: {
      flex: 1,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notesInput: {
      height: 80,
      textAlignVertical: 'top',
    },
    imageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageButtonText: {
      fontSize: 16,
      color: colors.primary,
      marginLeft: 8,
      fontWeight: '500',
    },
    previewImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginTop: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 40,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
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
    doneButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    doneButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // NEW: action rows
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    actionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
