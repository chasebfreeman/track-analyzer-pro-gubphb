
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
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { StorageService } from '@/utils/storage';
import { Track, TrackReading, LaneReading } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';

export default function RecordScreen() {
  const theme = useTheme();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showTrackPicker, setShowTrackPicker] = useState(false);

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
    loadTracks();
  }, []);

  const loadTracks = async () => {
    const loadedTracks = await StorageService.getTracks();
    setTracks(loadedTracks.sort((a, b) => a.name.localeCompare(b.name)));
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

    const now = new Date();
    const reading: TrackReading = {
      id: Date.now().toString(),
      trackId: selectedTrack.id,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      timestamp: now.getTime(),
      leftLane,
      rightLane,
    };

    try {
      await StorageService.saveReading(reading);
      Alert.alert('Success', 'Reading saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
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

  const renderLaneInputs = (
    lane: LaneReading,
    setLane: (lane: LaneReading) => void,
    title: string,
    laneType: 'left' | 'right'
  ) => (
    <View style={[styles.laneSection, { backgroundColor: colors.card }]}>
      <Text style={[styles.laneTitle, { color: theme.colors.text }]}>{title}</Text>

      <Text style={styles.label}>Track Temp (°F)</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="e.g., 85"
        placeholderTextColor={colors.textSecondary}
        value={lane.trackTemp}
        onChangeText={(text) => setLane({ ...lane, trackTemp: text })}
        keyboardType="numeric"
      />

      <Text style={styles.label}>UV Index</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="e.g., 7"
        placeholderTextColor={colors.textSecondary}
        value={lane.uvIndex}
        onChangeText={(text) => setLane({ ...lane, uvIndex: text })}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Keg SL</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="Enter value"
        placeholderTextColor={colors.textSecondary}
        value={lane.kegSL}
        onChangeText={(text) => setLane({ ...lane, kegSL: text })}
      />

      <Text style={styles.label}>Keg Out</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="Enter value"
        placeholderTextColor={colors.textSecondary}
        value={lane.kegOut}
        onChangeText={(text) => setLane({ ...lane, kegOut: text })}
      />

      <Text style={styles.label}>Grippo SL</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="Enter value"
        placeholderTextColor={colors.textSecondary}
        value={lane.grippoSL}
        onChangeText={(text) => setLane({ ...lane, grippoSL: text })}
      />

      <Text style={styles.label}>Grippo Out</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="Enter value"
        placeholderTextColor={colors.textSecondary}
        value={lane.grippoOut}
        onChangeText={(text) => setLane({ ...lane, grippoOut: text })}
      />

      <Text style={styles.label}>Shine</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="Enter value"
        placeholderTextColor={colors.textSecondary}
        value={lane.shine}
        onChangeText={(text) => setLane({ ...lane, shine: text })}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput, { color: theme.colors.text }]}
        placeholder="Additional notes..."
        placeholderTextColor={colors.textSecondary}
        value={lane.notes}
        onChangeText={(text) => setLane({ ...lane, notes: text })}
        multiline
        numberOfLines={3}
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>Record Data</Text>

        <View style={[styles.trackSelector, { backgroundColor: colors.card }]}>
          <Text style={styles.label}>Select Track *</Text>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => setShowTrackPicker(!showTrackPicker)}
          >
            <Text style={[styles.trackButtonText, { color: theme.colors.text }]}>
              {selectedTrack ? selectedTrack.name : 'Choose a track...'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron_down"
              android_material_icon_name={showTrackPicker ? 'expand_less' : 'expand_more'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showTrackPicker && (
            <View style={styles.trackList}>
              {tracks.length === 0 ? (
                <Text style={[styles.noTracksText, { color: colors.textSecondary }]}>
                  No tracks available. Add a track first in the Tracks tab.
                </Text>
              ) : (
                tracks.map((track, index) => (
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
                          { color: theme.colors.text },
                          selectedTrack?.id === track.id && styles.trackOptionTextSelected,
                        ]}
                      >
                        {track.name}
                      </Text>
                      {track.location && (
                        <Text style={[styles.trackOptionLocation, { color: colors.textSecondary }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  trackSelector: {
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
  },
  trackOptionTextSelected: {
    color: '#ffffff',
  },
  trackOptionLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  noTracksText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  laneSection: {
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
