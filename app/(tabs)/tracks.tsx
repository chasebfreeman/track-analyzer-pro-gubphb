
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  RefreshControl,
  Animated,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Track } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';

export default function TracksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackLocation, setNewTrackLocation] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep track of open swipeable refs to close them when opening another
  const openSwipeableRef = useRef<Swipeable | null>(null);

  const loadTracks = useCallback(async () => {
    console.log('Loading all tracks from Supabase');
    const tracks = await SupabaseStorageService.getAllTracks();
    setAllTracks(tracks);
    console.log('Loaded tracks:', tracks.length);
  }, []);

  const loadAvailableYears = useCallback(async () => {
    console.log('Loading available years');
    const years = await SupabaseStorageService.getAvailableYears();
    setAvailableYears(years);
    console.log('Available years:', years);
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('Tracks screen focused, loading data');
      loadTracks();
      loadAvailableYears();
    }, [loadTracks, loadAvailableYears])
  );

  useEffect(() => {
    loadTracks();
    loadAvailableYears();
  }, [loadTracks, loadAvailableYears]);

  useEffect(() => {
    console.log('Filtering tracks by year:', selectedYear);
    if (selectedYear === null) {
      setFilteredTracks(allTracks);
    } else {
      // Filter tracks that have readings in the selected year
      // For now, show all tracks (we'll filter in the browse screen)
      setFilteredTracks(allTracks);
    }
  }, [selectedYear, allTracks]);

  const handleRefresh = async () => {
    console.log('User pulled to refresh');
    setIsRefreshing(true);
    await loadTracks();
    await loadAvailableYears();
    setIsRefreshing(false);
  };

  const handleAddTrack = async () => {
    console.log('User tapped Add Track button');
    
    if (!newTrackName.trim() || !newTrackLocation.trim()) {
      Alert.alert('Error', 'Please enter both track name and location');
      return;
    }

    console.log('Creating new track:', newTrackName, newTrackLocation);
    const track = await SupabaseStorageService.createTrack(
      newTrackName.trim(),
      newTrackLocation.trim()
    );

    if (track) {
      console.log('Track created successfully');
      setNewTrackName('');
      setNewTrackLocation('');
      setIsAddingTrack(false);
      Keyboard.dismiss();
      await loadTracks();
      Alert.alert('Success', 'Track added successfully');
    } else {
      Alert.alert('Error', 'Failed to add track');
    }
  };

  const handleTrackPress = (track: Track) => {
    console.log('User tapped track:', track.name);
    // Close any open swipeable before navigating
    if (openSwipeableRef.current) {
      openSwipeableRef.current.close();
    }
    router.push({
      pathname: '/(tabs)/record',
      params: { trackId: track.id },
    });
  };

  const handleDeleteTrack = (track: Track) => {
    console.log('User swiped to delete track:', track.name);
    
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.name}"? This will also delete all readings for this track. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('User cancelled track deletion');
            // Close the swipeable
            if (openSwipeableRef.current) {
              openSwipeableRef.current.close();
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed track deletion');
            const success = await SupabaseStorageService.deleteTrack(track.id);
            
            if (success) {
              console.log('Track deleted successfully');
              await loadTracks();
              await loadAvailableYears();
              Alert.alert('Success', 'Track deleted successfully');
            } else {
              console.error('Failed to delete track');
              Alert.alert('Error', 'Failed to delete track. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    track: Track
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View
        style={[
          styles.deleteAction,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTrack(track)}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleSwipeableOpen = (swipeable: Swipeable) => {
    // Close previously open swipeable
    if (openSwipeableRef.current && openSwipeableRef.current !== swipeable) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = swipeable;
  };

  const styles = getStyles(colors);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tracks</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              console.log('User tapped + button');
              setIsAddingTrack(!isAddingTrack);
            }}
          >
            <IconSymbol
              ios_icon_name={isAddingTrack ? 'xmark' : 'plus'}
              android_material_icon_name={isAddingTrack ? 'close' : 'add'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {isAddingTrack && (
          <View style={styles.addTrackForm}>
            <TextInput
              style={styles.input}
              placeholder="Track Name"
              placeholderTextColor={colors.textSecondary}
              value={newTrackName}
              onChangeText={setNewTrackName}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor={colors.textSecondary}
              value={newTrackLocation}
              onChangeText={setNewTrackLocation}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleAddTrack}>
              <Text style={styles.saveButtonText}>Add Track</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.yearFilter}
          contentContainerStyle={styles.yearFilterContent}
        >
          <TouchableOpacity
            key="all-years"
            style={[styles.yearChip, selectedYear === null && styles.yearChipActive]}
            onPress={() => {
              console.log('User selected All Years filter');
              setSelectedYear(null);
            }}
          >
            <Text style={[styles.yearChipText, selectedYear === null && styles.yearChipTextActive]}>
              All Years
            </Text>
          </TouchableOpacity>
          {availableYears.map((year, yearIndex) => (
            <TouchableOpacity
              key={`year-${year}-${yearIndex}`}
              style={[styles.yearChip, selectedYear === year && styles.yearChipActive]}
              onPress={() => {
                console.log('User selected year filter:', year);
                setSelectedYear(year);
              }}
            >
              <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextActive]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.tracksList}
          contentContainerStyle={styles.tracksListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filteredTracks.length === 0 ? (
            <View key="empty-state" style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="flag.checkered"
                android_material_icon_name="sports-score"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>No tracks yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap the + button to add your first track</Text>
            </View>
          ) : (
            <React.Fragment>
              {filteredTracks.map((track, trackIndex) => (
                <Swipeable
                  key={`track-${track.id}-${trackIndex}`}
                  renderRightActions={(progress, dragX) =>
                    renderRightActions(progress, dragX, track)
                  }
                  onSwipeableOpen={(direction, swipeable) => {
                    console.log('User swiped track:', track.name);
                    handleSwipeableOpen(swipeable);
                  }}
                  overshootRight={false}
                  friction={2}
                  rightThreshold={40}
                >
                  <TouchableOpacity
                    style={styles.trackCard}
                    onPress={() => handleTrackPress(track)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.trackIcon}>
                      <IconSymbol
                        ios_icon_name="flag.checkered"
                        android_material_icon_name="sports-score"
                        size={32}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.trackInfo}>
                      <Text style={styles.trackName}>{track.name}</Text>
                      <Text style={styles.trackLocation}>{track.location}</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="arrow-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </React.Fragment>
          )}
        </ScrollView>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addTrackForm: {
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginHorizontal: 20,
      marginBottom: 16,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    yearFilter: {
      maxHeight: 50,
      marginBottom: 16,
    },
    yearFilterContent: {
      paddingHorizontal: 20,
      gap: 8,
    },
    yearChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    yearChipText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    yearChipTextActive: {
      color: '#FFFFFF',
    },
    tracksList: {
      flex: 1,
    },
    tracksListContent: {
      padding: 20,
      gap: 12,
      // Add extra bottom padding to ensure last track is fully accessible above the FloatingTabBar
      paddingBottom: 140,
    },
    trackCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
    },
    trackIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    trackInfo: {
      flex: 1,
    },
    trackName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    trackLocation: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    deleteAction: {
      justifyContent: 'center',
      alignItems: 'flex-end',
      width: 100,
    },
    deleteButton: {
      backgroundColor: '#FF3B30',
      justifyContent: 'center',
      alignItems: 'center',
      width: 100,
      height: '100%',
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
      marginTop: 4,
    },
  });
}
