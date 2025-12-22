
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { StorageService } from '@/utils/storage';
import { TrackReading, Track } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';

export default function ReadingDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const [reading, setReading] = React.useState<TrackReading | null>(null);
  const [track, setTrack] = React.useState<Track | null>(null);

  React.useEffect(() => {
    loadReading();
  }, [params.readingId]);

  const loadReading = async () => {
    try {
      const readings = await StorageService.getReadings();
      const foundReading = readings.find((r) => r.id === params.readingId);
      if (foundReading) {
        setReading(foundReading);
        
        // Load the track information
        const tracks = await StorageService.getTracks();
        const foundTrack = tracks.find((t) => t.id === foundReading.trackId);
        if (foundTrack) {
          setTrack(foundTrack);
        }
      }
    } catch (error) {
      console.error('Error loading reading:', error);
    }
  };

  const handleDelete = () => {
    if (!reading) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete the reading from ${reading.date} at ${reading.time}?`
      );
      if (confirmed) {
        deleteReading();
      }
    } else {
      Alert.alert(
        'Delete Reading',
        `Are you sure you want to delete the reading from ${reading.date} at ${reading.time}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: deleteReading,
          },
        ]
      );
    }
  };

  const deleteReading = async () => {
    if (!reading) return;

    try {
      await StorageService.deleteReading(reading.id);
      router.back();
    } catch (error) {
      console.error('Error deleting reading:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete reading. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete reading. Please try again.');
      }
    }
  };

  const renderLaneData = (lane: any, title: string) => {
    const styles = getStyles(colors);
    
    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>
        <View style={styles.dataGrid}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Track Temp:</Text>
            <Text style={styles.dataValue}>
              {lane.trackTemp || 'N/A'}°F
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>UV Index:</Text>
            <Text style={styles.dataValue}>
              {lane.uvIndex || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Keg SL:</Text>
            <Text style={styles.dataValue}>
              {lane.kegSL || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Keg Out:</Text>
            <Text style={styles.dataValue}>
              {lane.kegOut || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Grippo SL:</Text>
            <Text style={styles.dataValue}>
              {lane.grippoSL || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Grippo Out:</Text>
            <Text style={styles.dataValue}>
              {lane.grippoOut || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Shine:</Text>
            <Text style={styles.dataValue}>
              {lane.shine || 'N/A'}
            </Text>
          </View>
          {lane.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.dataLabel}>Notes:</Text>
              <Text style={styles.notesValue}>
                {lane.notes}
              </Text>
            </View>
          )}
          {lane.imageUri && (
            <Image source={{ uri: lane.imageUri }} style={styles.laneImage} />
          )}
        </View>
      </View>
    );
  };

  const styles = getStyles(colors);

  if (!reading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={24}
            color="#ff3b30"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{track ? track.name : 'Reading Details'}</Text>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar_today"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateTimeText}>{reading.date}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <IconSymbol
                ios_icon_name="clock"
                android_material_icon_name="access_time"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateTimeText}>{reading.time}</Text>
            </View>
          </View>
        </View>

        {reading.classCurrentlyRunning && (
          <View style={styles.classSection}>
            <Text style={styles.classSectionTitle}>Class Currently Running</Text>
            <Text style={styles.classValue}>{reading.classCurrentlyRunning}</Text>
          </View>
        )}

        {renderLaneData(reading.leftLane, 'Left Lane')}
        {renderLaneData(reading.rightLane, 'Right Lane')}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'android' ? 48 : 60,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backButtonText: {
      fontSize: 17,
      color: colors.primary,
    },
    deleteButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 120,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    headerInfo: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 12,
      color: colors.text,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: 20,
    },
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dateTimeText: {
      fontSize: 16,
      color: colors.text,
    },
    classSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    classSectionTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    classValue: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
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
      color: colors.primary,
    },
    dataGrid: {
      gap: 12,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dataLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    dataValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    notesRow: {
      marginTop: 8,
    },
    notesValue: {
      fontSize: 15,
      marginTop: 6,
      lineHeight: 22,
      color: colors.text,
    },
    laneImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginTop: 12,
      resizeMode: 'cover',
    },
  });
}
