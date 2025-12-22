
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
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Record screen focused');
      console.log('Params:', JSON.stringify(params));
      
      loadTracks().then(() => {
        console.log('Tracks reloaded on focus');
      });
    }, [])
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
  }, [params.trackId, tracks]);

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
      id: Date.now().toString(),
      trackId: selectedTrack.id,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      timestamp: now.getTime(),
      classCurrentlyRunning: classCurrentlyRunning,
      leftLane,
      rightLane,
    };

    try {
      await StorageService.saveReading(reading);
      Alert.alert('Success', 'Reading saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
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
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving reading:', error);
      Alert.alert('Error', 'Failed to save reading');
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
        <Text style={styles.title}>Record Data</Text>

        <View style={styles.trackSelector}>
          <Text style={styles.label}>Select Track *</Text>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              console.log('Track picker toggled');
              Keyboard.dismiss();
              setShowTrackPicker(!showTrackPicker);
            }}
          >
            <Text style={styles.trackButtonText}>
              {selectedTrack ? selectedTrack.name : 'Choose a track...'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name={showTrackPicker ? 'expand_less' : 'expand_more'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>

          {showTrackPicker && (
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
              <Text style={styles.saveButtonText}>Save Reading</Text>
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
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 20,
      color: colors.text,
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
