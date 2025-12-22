
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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { StorageService } from '@/utils/storage';
import { Track } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';

export default function TracksScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [trackLocation, setTrackLocation] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadTracks();
    // Small delay to ensure component is fully mounted and interactive
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Reload tracks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Tracks screen focused, reloading tracks');
      loadTracks();
      setIsReady(true);
    }, [])
  );

  const loadTracks = async () => {
    console.log('Loading tracks...');
    const loadedTracks = await StorageService.getTracks();
    console.log('Loaded tracks count:', loadedTracks.length);
    setTracks(loadedTracks.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleAddTrack = async () => {
    if (!trackName.trim()) {
      Alert.alert('Error', 'Please enter a track name');
      return;
    }

    const newTrack: Track = {
      id: Date.now().toString(),
      name: trackName.trim(),
      location: trackLocation.trim(),
      createdAt: Date.now(),
    };

    try {
      await StorageService.saveTrack(newTrack);
      setTrackName('');
      setTrackLocation('');
      setShowAddForm(false);
      loadTracks();
      Alert.alert('Success', 'Track added successfully!');
    } catch (error) {
      console.error('Error adding track:', error);
      Alert.alert('Error', 'Failed to add track');
    }
  };

  const handleDeleteTrack = useCallback((track: Track) => {
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.name}"? This will also delete all readings for this track.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteTrack(track.id);
              loadTracks();
              Alert.alert('Success', 'Track deleted successfully');
            } catch (error) {
              console.error('Error deleting track:', error);
              Alert.alert('Error', 'Failed to delete track');
            }
          },
        },
      ]
    );
  }, []);

  const handleTrackPress = useCallback((track: Track) => {
    console.log('Track pressed:', track.name, 'ID:', track.id);
    router.push({
      pathname: '/(tabs)/record',
      params: { trackId: track.id, trackName: track.name },
    });
  }, [router]);

  return (
    <View style={styles.container} collapsable={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Race Tracks</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name={showAddForm ? 'close' : 'add'}
              size={24}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Add New Track</Text>
            <TextInput
              style={styles.input}
              placeholder="Track Name *"
              placeholderTextColor={colors.textSecondary}
              value={trackName}
              onChangeText={setTrackName}
            />
            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              placeholderTextColor={colors.textSecondary}
              value={trackLocation}
              onChangeText={setTrackLocation}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleAddTrack}>
              <Text style={styles.submitButtonText}>Add Track</Text>
            </TouchableOpacity>
          </View>
        )}

        {tracks.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="map"
              android_material_icon_name="map"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              No tracks yet. Add your first track to get started!
            </Text>
          </View>
        ) : (
          <View style={styles.tracksList} collapsable={false}>
            {tracks.map((track, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={styles.trackCard}
                  onPress={() => handleTrackPress(track)}
                  activeOpacity={0.7}
                  disabled={!isReady}
                  collapsable={false}
                >
                  <View style={styles.trackInfo} pointerEvents="none">
                    <View style={styles.trackIcon}>
                      <IconSymbol
                        ios_icon_name="map"
                        android_material_icon_name="map"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.trackDetails}>
                      <Text style={styles.trackName}>
                        {track.name}
                      </Text>
                      {track.location ? (
                        <Text style={styles.trackLocation}>
                          {track.location}
                        </Text>
                      ) : null}
                      <Text style={styles.trackDate}>
                        Added {new Date(track.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron_right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteTrack(track);
                    }}
                    activeOpacity={0.7}
                    disabled={!isReady}
                  >
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  header: {
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
  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 123, 255, 0.3)',
    elevation: 4,
  },
  addForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    color: colors.textSecondary,
  },
  tracksList: {
    gap: 12,
  },
  trackCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
  },
  trackName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  trackLocation: {
    fontSize: 14,
    marginBottom: 2,
    color: colors.textSecondary,
  },
  trackDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },
});
