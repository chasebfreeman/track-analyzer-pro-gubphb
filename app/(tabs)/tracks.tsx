
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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import { Track } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';

export default function TracksScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [trackLocation, setTrackLocation] = useState('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const loadTracks = useCallback(async () => {
    console.log('Loading tracks...');
    try {
      const loadedTracks = await SupabaseStorageService.getTracks();
      console.log('Loaded tracks count:', loadedTracks.length);
      setAllTracks(loadedTracks.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  }, []);

  const loadAvailableYears = useCallback(async () => {
    try {
      const years = await SupabaseStorageService.getAvailableYears();
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
      
      console.log('Available years:', sortedYears);
      setAvailableYears(sortedYears);
    } catch (error) {
      console.error('Error loading available years:', error);
      // Fallback to basic years if there's an error
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear + 1, currentYear, 2025, 2024].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a));
    }
  }, []);

  useEffect(() => {
    console.log('TracksScreen mounted');
    loadTracks();
    loadAvailableYears();
  }, [loadTracks, loadAvailableYears]);

  useFocusEffect(
    useCallback(() => {
      console.log('Tracks screen focused, reloading tracks');
      loadTracks();
      loadAvailableYears();
    }, [loadTracks, loadAvailableYears])
  );

  useEffect(() => {
    console.log('Selected year changed to:', selectedYear);
    
    const filterTracks = async () => {
      console.log('Filtering tracks for year:', selectedYear);
      try {
        // Only show tracks that have readings in the selected year
        const tracksToShow: Track[] = [];
        
        for (const track of allTracks) {
          const yearsForTrack = await SupabaseStorageService.getAvailableYearsForTrack(track.id);
          
          // Only show track if it has readings in the selected year
          if (yearsForTrack.includes(selectedYear)) {
            tracksToShow.push(track);
          }
        }
        
        console.log('Tracks to show for', selectedYear, ':', tracksToShow.length);
        console.log('Track names:', tracksToShow.map(t => t.name));
        setFilteredTracks(tracksToShow);
      } catch (error) {
        console.error('Error filtering tracks by year:', error);
        setFilteredTracks([]);
      }
    };

    filterTracks();
  }, [selectedYear, allTracks]);

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
      await SupabaseStorageService.saveTrack(newTrack);
      setTrackName('');
      setTrackLocation('');
      setShowAddForm(false);
      Keyboard.dismiss();
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
              await SupabaseStorageService.deleteTrack(track.id);
              loadTracks();
              loadAvailableYears();
              Alert.alert('Success', 'Track deleted successfully');
            } catch (error) {
              console.error('Error deleting track:', error);
              Alert.alert('Error', 'Failed to delete track');
            }
          },
        },
      ]
    );
  }, [loadTracks, loadAvailableYears]);

  const handleTrackPress = useCallback((track: Track) => {
    console.log('Track pressed:', track.name, 'ID:', track.id, 'Year:', selectedYear);
    try {
      router.push({
        pathname: '/(tabs)/browse',
        params: { 
          trackId: track.id, 
          trackName: track.name,
          year: selectedYear.toString(),
        },
      });
      console.log('Navigation to browse screen initiated successfully');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Failed to navigate to browse screen. Please try again.');
    }
  }, [router, selectedYear]);

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
    yearSelector: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    yearLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Race Tracks</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              console.log('Add button pressed');
              setShowAddForm(!showAddForm);
              if (showAddForm) {
                Keyboard.dismiss();
              }
            }}
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

        <View style={styles.yearSelector}>
          <Text style={styles.yearLabel}>Select Year</Text>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => {
              console.log('Year picker toggled');
              Keyboard.dismiss();
              setShowYearPicker(!showYearPicker);
            }}
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
              {availableYears.map((year, index) => (
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
              ))}
            </View>
          )}
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
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              placeholderTextColor={colors.textSecondary}
              value={trackLocation}
              onChangeText={setTrackLocation}
              returnKeyType="done"
              onSubmitEditing={handleAddTrack}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleAddTrack}>
              <Text style={styles.submitButtonText}>Add Track</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="map"
              android_material_icon_name="map"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {allTracks.length === 0 
                ? 'No tracks yet. Add your first track to get started!'
                : `No tracks with readings in ${selectedYear}. Select a different year or add new readings.`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.tracksList}>
            {filteredTracks.map((track, index) => (
              <React.Fragment key={track.id}>
                <TouchableOpacity
                  style={styles.trackCard}
                  onPress={() => handleTrackPress(track)}
                  activeOpacity={0.7}
                >
                  <View style={styles.trackInfo}>
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
