
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Track, LaneReading } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import * as ImagePicker from 'expo-image-picker';

export default function RecordScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [leftLane, setLeftLane] = useState<LaneReading>(getEmptyLaneReading());
  const [rightLane, setRightLane] = useState<LaneReading>(getEmptyLaneReading());
  const [isSaving, setIsSaving] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);

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

  const loadTracks = useCallback(async () => {
    console.log('Loading tracks for record screen');
    const allTracks = await SupabaseStorageService.getAllTracks();
    // Sort tracks alphabetically
    const sortedTracks = allTracks.sort((a, b) => a.name.localeCompare(b.name));
    setTracks(sortedTracks);
    
    // If trackId is in params, select that track
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

  const pickImage = async (lane: 'left' | 'right') => {
    console.log('User tapped pick image for', lane, 'lane');
    
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
      if (lane === 'left') {
        setLeftLane({ ...leftLane, imageUri: result.assets[0].uri });
      } else {
        setRightLane({ ...rightLane, imageUri: result.assets[0].uri });
      }
    }
  };

  const handleSaveReading = async () => {
    console.log('User tapped Save Reading button');
    
    if (!selectedTrack) {
      Alert.alert('Error', 'Please select a track');
      return;
    }

    setIsSaving(true);

    const now = new Date();
    const reading = {
      trackId: selectedTrack.id,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      timestamp: now.getTime(),
      year: now.getFullYear(),
      leftLane,
      rightLane,
    };

    console.log('Saving reading:', reading);

    const savedReading = await SupabaseStorageService.createReading(reading);

    setIsSaving(false);

    if (savedReading) {
      console.log('Reading saved successfully');
      Alert.alert('Success', 'Reading saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            setLeftLane(getEmptyLaneReading());
            setRightLane(getEmptyLaneReading());
            Keyboard.dismiss();
          },
        },
      ]);
    } else {
      Alert.alert('Error', 'Failed to save reading');
    }
  };

  const handleCancel = () => {
    console.log('User tapped Cancel button');
    setLeftLane(getEmptyLaneReading());
    setRightLane(getEmptyLaneReading());
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
          />
        </View>

        <TouchableOpacity
          style={styles.imageButton}
          onPress={() => pickImage(laneType)}
        >
          <IconSymbol
            ios_icon_name="camera"
            android_material_icon_name="camera"
            size={24}
            color={colors.primary}
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Record Reading</Text>
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
              <Text style={styles.dropdownButtonText}>
                {selectedTrack ? selectedTrack.name : 'Choose a track...'}
              </Text>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="arrow-downward"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {selectedTrack && (
            <>
              {renderLaneInputs(leftLane, setLeftLane, 'Left Lane', 'left')}
              {renderLaneInputs(rightLane, setRightLane, 'Right Lane', 'right')}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSaveReading}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Reading'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Track Dropdown Modal */}
        <Modal
          visible={showTrackDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTrackDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTrackDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Track</Text>
                <TouchableOpacity onPress={() => setShowTrackDropdown(false)}>
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.dropdownList}>
                {tracks.map((track, index) => (
                  <TouchableOpacity
                    key={`track-dropdown-${track.id}-${index}`}
                    style={[
                      styles.dropdownItem,
                      selectedTrack?.id === track.id && styles.dropdownItemActive,
                    ]}
                    onPress={() => handleTrackSelect(track)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedTrack?.id === track.id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {track.name}
                    </Text>
                    {selectedTrack?.id === track.id && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
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
  });
}
