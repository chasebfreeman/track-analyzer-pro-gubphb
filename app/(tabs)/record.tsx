
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/styles/commonStyles';
import { StorageService } from '@/utils/storage';
import { Track, TrackReading, LaneReading } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';

export default function RecordScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [classCurrentlyRunning, setClassCurrentlyRunning] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);

  const [leftLane, setLeftLane] = useState<LaneReading>({
    trackTemp: '',
    uvIndex: '',
    kegSL: '',
    kegOut: '',
    grippoSL: '',
    grippoOut: '',
    shine: '',
    notes: '',
  });

  const [rightLane, setRightLane] = useState<LaneReading>({
    trackTemp: '',
    uvIndex: '',
    kegSL: '',
    kegOut: '',
    grippoSL: '',
    grippoOut: '',
    shine: '',
    notes: '',
  });

  useEffect(() => {
    console.log('RecordScreen mounted');
    loadTracks();
    loadAvailableYears();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Record screen focused');
      console.log('Params:', JSON.stringify(params));
      
      loadTracks().then(() => {
        console.log('Tracks reloaded on focus');
      });
      loadAvailableYears();

      // Check if we're in edit mode
      if (params.editMode === 'true' && params.readingId) {
        console.log('Edit mode detected, loading reading data');
        setEditMode(true);
        setEditingReadingId(params.readingId as string);
        
        // Load the reading data from params
        setClassCurrentlyRunning((params.classCurrentlyRunning as string) || '');
        
        // Load left lane data
        setLeftLane({
          trackTemp: (params.leftLaneTrackTemp as string) || '',
          uvIndex: (params.leftLaneUvIndex as string) || '',
          kegSL: (params.leftLaneKegSL as string) || '',
          kegOut: (params.leftLaneKegOut as string) || '',
          grippoSL: (params.leftLaneGrippoSL as string) || '',
          grippoOut: (params.leftLaneGrippoOut as string) || '',
          shine: (params.leftLaneShine as string) || '',
          notes: (params.leftLaneNotes as string) || '',
          imageUri: (params.leftLaneImageUri as string) || undefined,
        });
        
        // Load right lane data
        setRightLane({
          trackTemp: (params.rightLaneTrackTemp as string) || '',
          uvIndex: (params.rightLaneUvIndex as string) || '',
          kegSL: (params.rightLaneKegSL as string) || '',
          kegOut: (params.rightLaneKegOut as string) || '',
          grippoSL: (params.rightLaneGrippoSL as string) || '',
          grippoOut: (params.rightLaneGrippoOut as string) || '',
          shine: (params.rightLaneShine as string) || '',
          notes: (params.rightLaneNotes as string) || '',
          imageUri: (params.rightLaneImageUri as string) || undefined,
        });
      } else {
        // Reset edit mode when not editing
        setEditMode(false);
        setEditingReadingId(null);
      }
    }, [params])
  );

  useEffect(() => {
    if (params.trackId && tracks.length > 0) {
      console.log('Attempting to select track with ID:', params.trackId);
      const track = tracks.find((t) => t.id === params.trackId);
      if (track) {
        console.log('Auto-selecting track:', track.name);
        setSelectedTrack(track);
        setShowTrackPicker(false);
      } else {
        console.log('Track not found with id:', params.trackId);
        console.log('Available track IDs:', tracks.map(t => t.id));
      }
    }
    
    if (params.year) {
      const year = parseInt(params.year as string);
      console.log('Setting year from params:', year);
      setSelectedYear(year);
    }
  }, [params.trackId, params.year, tracks]);

  const loadTracks = async () => {
    setIsLoading(true);
    console.log('Loading tracks in RecordScreen...');
    try {
      const loadedTracks = await StorageService.getTracks();
      console.log('Loaded tracks:', loadedTracks.length);
      setTracks(loadedTracks.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    try {
      const years = await StorageService.getAvailableYears();
      const currentYear = new Date().getFullYear();
      
      // Create a comprehensive list of years from 2024 to current year + 1
      const allYears = new Set<number>();
      
      // Add years from data
      years.forEach(year => allYears.add(year));
      
      // Always include 2024, 2025, current year, and next year
      allYears.add(2024);
      allYears.add(2025);
      allYears.add(currentYear);
      allYears.add(currentYear + 1);
      
      // Convert to sorted array (newest first)
      const sortedYears = Array.from(allYears).sort((a, b) => b - a);
      
      console.log('Available years for record screen:', sortedYears);
      setAvailableYears(sortedYears);
    } catch (error) {
      console.error('Error loading available years:', error);
      // Fallback to basic years if there's an error
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear + 1, currentYear, 2025, 2024].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a));
    }
  };

  const pickImage = async (lane: 'left' | 'right') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (lane === 'left') {
        setLeftLane({ ...leftLane, imageUri: result.assets[0].uri });
      } else {
        setRightLane({ ...rightLane, imageUri: result.assets[0].uri });
      }
    }
  };

  const handleSaveReading = async () => {
    if (!selectedTrack) {
      Alert.alert('Error', 'Please select a track first');
      return;
    }

    Keyboard.dismiss();

    const now = new Date();
    const reading: TrackReading = {
      id: editMode && editingReadingId ? editingReadingId : Date.now().toString(),
      trackId: selectedTrack.id,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      timestamp: now.getTime(),
      year: selectedYear,
      classCurrentlyRunning: classCurrentlyRunning,
      leftLane,
      rightLane,
    };

    console.log(editMode ? 'Updating reading:' : 'Saving new reading:', reading.id);

    try {
      await StorageService.saveReading(reading);
      
      const successMessage = editMode 
        ? `Reading updated successfully for ${selectedYear}!`
        : `Reading saved successfully for ${selectedYear}!`;
      
      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            if (editMode) {
              // Navigate back to browse after editing
              router.back();
            } else {
              // Clear form for new entry
              setClassCurrentlyRunning('');
              setLeftLane({
                trackTemp: '',
                uvIndex: '',
                kegSL: '',
                kegOut: '',
                grippoSL: '',
                grippoOut: '',
                shine: '',
                notes: '',
              });
              setRightLane({
                trackTemp: '',
                uvIndex: '',
                kegSL: '',
                kegOut: '',
                grippoSL: '',
                grippoOut: '',
                shine: '',
                notes: '',
              });
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving reading:', error);
      Alert.alert('Error', 'Failed to save reading');
    }
  };

  const handleCancel = () => {
    if (editMode) {
      router.back();
    }
  };

  const handleTrackSelect = (track: Track) => {
    console.log('Track selected from picker:', track.name);
    setSelectedTrack(track);
    setShowTrackPicker(false);
  };

  const renderLaneInputs = (
    lane: LaneReading,
    setLane: (lane: LaneReading) => void,
    title: string,
    laneType: 'left' | 'right'
  ) => {
    const styles = getStyles(colors);
    
    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>

        <Text style={styles.label}>Track Temp (°F)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 85"
          placeholderTextColor={colors.textSecondary}
          value={lane.trackTemp}
          onChangeText={(text) => setLane({ ...lane, trackTemp: text })}
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>UV Index</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 7"
          placeholderTextColor={colors.textSecondary}
          value={lane.uvIndex}
          onChangeText={(text) => setLane({ ...lane, uvIndex: text })}
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>Keg SL</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter value"
          placeholderTextColor={colors.textSecondary}
          value={lane.kegSL}
          onChangeText={(text) => setLane({ ...lane, kegSL: text })}
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>Keg Out</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter value"
          placeholderTextColor={colors.textSecondary}
          value={lane.kegOut}
          onChangeText={(text) => setLane({ ...lane, kegOut: text })}
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>Grippo SL</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter value"
          placeholderTextColor={colors.textSecondary}
          value={lane.grippoSL}
          onChangeText={(text) => setLane({ ...lane, grippoSL: text })}
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>Grippo Out</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter value"
          placeholderTextColor={colors.textSecondary}
          value={lane.grippoOut}
          onChangeText={(text) => setLane({ ...lane, grippoOut: text })}
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>Shine</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter value"
          placeholderTextColor={colors.textSecondary}
          value={lane.shine}
          onChangeText={(text) => setLane({ ...lane, shine: text })}
          returnKeyType="next"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Additional notes..."
          placeholderTextColor={colors.textSecondary}
          value={lane.notes}
          onChangeText={(text) => setLane({ ...lane, notes: text })}
          multiline
          numberOfLines={3}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={styles.imageButton}
          onPress={() => pickImage(laneType)}
        >
          <IconSymbol
            ios_icon_name="camera"
            android_material_icon_name="camera_alt"
            size={20}
            color="#ffffff"
          />
          <Text style={styles.imageButtonText}>
            {lane.imageUri ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>

        {lane.imageUri && (
          <Image source={{ uri: lane.imageUri }} style={styles.previewImage} />
        )}
      </View>
    );
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{editMode ? 'Edit Reading' : 'Record Data'}</Text>
          {editMode && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.yearSelector}>
          <Text style={styles.label}>Select Year *</Text>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => {
              console.log('Year picker toggled');
              Keyboard.dismiss();
              setShowYearPicker(!showYearPicker);
            }}
            disabled={editMode}
          >
            <View style={styles.yearButtonContent}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar_today"
                size={20}
                color={editMode ? colors.textSecondary : colors.primary}
              />
              <Text style={[styles.yearButtonText, editMode && styles.disabledText]}>{selectedYear}</Text>
            </View>
            {!editMode && (
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name={showYearPicker ? 'expand_less' : 'expand_more'}
                size={20}
                color={colors.text}
              />
            )}
          </TouchableOpacity>

          {showYearPicker && !editMode && (
            <View style={styles.yearList}>
              {availableYears.map((year, index) => (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={[
                      styles.yearOption,
                      selectedYear === year && styles.yearOptionSelected,
                    ]}
                    onPress={() => {
                      console.log('Year selected in record screen:', year);
                      setSelectedYear(year);
                      setShowYearPicker(false);
                    }}
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
              ))}
            </View>
          )}
        </View>

        <View style={styles.trackSelector}>
          <Text style={styles.label}>Select Track *</Text>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              console.log('Track picker toggled');
              Keyboard.dismiss();
              setShowTrackPicker(!showTrackPicker);
            }}
            disabled={editMode}
          >
            <Text style={[styles.trackButtonText, editMode && styles.disabledText]}>
              {selectedTrack ? selectedTrack.name : 'Choose a track...'}
            </Text>
            {!editMode && (
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name={showTrackPicker ? 'expand_less' : 'expand_more'}
                size={20}
                color={colors.text}
              />
            )}
          </TouchableOpacity>

          {showTrackPicker && !editMode && (
            <View style={styles.trackList}>
              {tracks.length === 0 ? (
                <Text style={styles.noTracksText}>
                  No tracks available. Add a track first in the Tracks tab.
                </Text>
              ) : (
                tracks.map((track, index) => (
                  <React.Fragment key={track.id}>
                    <TouchableOpacity
                      style={[
                        styles.trackOption,
                        selectedTrack?.id === track.id && styles.trackOptionSelected,
                      ]}
                      onPress={() => handleTrackSelect(track)}
                    >
                      <Text
                        style={[
                          styles.trackOptionText,
                          selectedTrack?.id === track.id && styles.trackOptionTextSelected,
                        ]}
                      >
                        {track.name}
                      </Text>
                      {track.location && (
                        <Text style={styles.trackOptionLocation}>
                          {track.location}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </View>
          )}
        </View>

        {selectedTrack && (
          <>
            <View style={styles.classSection}>
              <Text style={styles.label}>Class Currently Running</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pro Stock, Super Comp, etc."
                placeholderTextColor={colors.textSecondary}
                value={classCurrentlyRunning}
                onChangeText={setClassCurrentlyRunning}
                returnKeyType="next"
              />
            </View>

            {renderLaneInputs(leftLane, setLeftLane, 'Left Lane', 'left')}
            {renderLaneInputs(rightLane, setRightLane, 'Right Lane', 'right')}

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveReading}>
              <IconSymbol
                ios_icon_name="checkmark"
                android_material_icon_name="check"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.saveButtonText}>
                {editMode ? `Update Reading for ${selectedYear}` : `Save Reading for ${selectedYear}`}
              </Text>
            </TouchableOpacity>
          </>
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
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    cancelButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    yearSelector: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
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
    yearButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    yearButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    disabledText: {
      color: colors.textSecondary,
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
    trackOptionLocation: {
      fontSize: 12,
      marginTop: 2,
      color: colors.textSecondary,
    },
    noTracksText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
      color: colors.textSecondary,
    },
    classSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    laneSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    laneTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 16,
      marginBottom: 12,
      color: colors.text,
    },
    notesInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    imageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    imageButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    previewImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginTop: 12,
      resizeMode: 'cover',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
      marginBottom: 20,
      boxShadow: '0px 4px 8px rgba(40, 167, 69, 0.3)',
      elevation: 4,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '700',
    },
  });
}
