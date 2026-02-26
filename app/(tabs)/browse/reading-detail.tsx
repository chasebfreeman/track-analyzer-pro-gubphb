//app(tabs)/browse/reading-detail.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { TrackReading, Track } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';

export default function ReadingDetailScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const router = useRouter();

  const [reading, setReading] = useState<TrackReading | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  const [leftImageUrl, setLeftImageUrl] = useState<string | null>(null);
  const [rightImageUrl, setRightImageUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    console.log('Loading reading detail:', params.readingId);

    if (!params.readingId || !params.trackId) {
      console.log('Missing readingId or trackId');
      return;
    }

    // Load track
    const tracks = await SupabaseStorageService.getAllTracks();
    const foundTrack = tracks.find((t) => t.id === params.trackId);
    if (foundTrack) setTrack(foundTrack);

    // Load readings for this track and find the one
    const foundReading = await SupabaseStorageService.getReadingById(
      params.readingId as string
);

    if (foundReading) {
  setReading(foundReading);
  console.log('Reading loaded:', foundReading.id);

  console.log('WEATHER on detail:', {
    temp_f: foundReading.temp_f,
    humidity_pct: foundReading.humidity_pct,
    baro_inhg: foundReading.baro_inhg,
    adr: foundReading.adr,
    correction: foundReading.correction,
    weather_ts: foundReading.weather_ts,
  });

} else {
  console.log('Reading not found in list for track:', params.trackId);
  setReading(null);
}
  }, [params.readingId, params.trackId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when coming back from Edit
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Load signed image URLs whenever reading changes
  useEffect(() => {
    async function loadSignedUrls() {
      if (!reading) {
        setLeftImageUrl(null);
        setRightImageUrl(null);
        return;
      }

      const leftPath =
        (reading as any).left_photo_path ?? (reading as any).leftPhotoPath ?? null;
      const rightPath =
        (reading as any).right_photo_path ?? (reading as any).rightPhotoPath ?? null;

      const { leftUrl, rightUrl } = await SupabaseStorageService.getSignedUrlsForReading({
        leftPhotoPath: leftPath,
        rightPhotoPath: rightPath,
        expiresInSeconds: 60 * 60 * 24, // 24 hours for testing
      });

      setLeftImageUrl(leftUrl);
      setRightImageUrl(rightUrl);

      console.log('Signed URLs:', { leftUrl: !!leftUrl, rightUrl: !!rightUrl });
    }

    loadSignedUrls();
  }, [reading]);

  const handleEdit = () => {
    if (!reading) return;

    router.push({
      pathname: "/(tabs)/record",
      params: { editReadingId: reading.id, trackId: reading.trackId },
});
  };

  const handleDelete = () => {
    console.log('User tapped Delete button');
    Alert.alert(
      'Delete Reading',
      'Are you sure you want to delete this reading? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteReading },
      ]
    );
  };

  const deleteReading = async () => {
    console.log('Deleting reading:', reading?.id);
    if (!reading) return;

    const success = await SupabaseStorageService.deleteReading(reading.id);

    if (success) {
      console.log('Reading deleted successfully');
      Alert.alert('Success', 'Reading deleted successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', 'Failed to delete reading');
    }
  };

  const formatTimeInTimeZone = (ms: number, timeZone: string) => {
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
  const fmtNum = (n: any, digits = 1) => {
  const fmtTs = (ts?: string) => {
  if (!ts) return "N/A";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts; // fallback if weird format
  // Example: 02/26/2026, 11:13:54 AM
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v.toFixed(digits) : "N/A";
};

const hasWeather = (r: TrackReading) =>
  r.temp_f != null ||
  r.humidity_pct != null ||
  r.baro_inhg != null ||
  r.adr != null ||
  r.correction != null ||
  !!r.weather_ts;

const renderWeatherSnapshot = (r: TrackReading) => {
  if (!hasWeather(r)) return null;

  return (
    <View style={styles.laneSection}>
      <Text style={styles.laneTitle}>Weather Snapshot</Text>

      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Temp (°F)</Text>
          <Text style={styles.dataValue}>{fmtNum(r.temp_f, 1)}</Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Humidity (%)</Text>
          <Text style={styles.dataValue}>{fmtNum(r.humidity_pct, 0)}</Text>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Barometer (inHg)</Text>
          <Text style={styles.dataValue}>{fmtNum(r.baro_inhg, 3)}</Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Correction</Text>
          <Text style={styles.dataValue}>{fmtNum(r.correction, 4)}</Text>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>ADR</Text>
          <Text style={styles.dataValue}>{fmtNum(r.adr, 2)}</Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={styles.dataValue} numberOfLines={1}>
            {fmtTs(r.weather_ts)}
          </Text>
          <Text style={styles.dataValue}>{r.weather_ts || "N/A"}</Text>
        </View>
      </View>
    </View>
  );
};
  const getDisplayDate = (r: TrackReading) => r.trackDate || r.date;

  const getDisplayTime = (r: TrackReading) => {
    if (r.timeZone && r.timestamp) {
      return formatTimeInTimeZone(r.timestamp, r.timeZone);
    }
    return r.time;
  };

  const renderLaneData = (lane: any, title: string) => {
    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Track Temp</Text>
            <Text style={styles.dataValue}>{lane.trackTemp || 'N/A'}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>UV Index</Text>
            <Text style={styles.dataValue}>{lane.uvIndex || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Keg SL</Text>
            <Text style={styles.dataValue}>{lane.kegSL || 'N/A'}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Keg Out</Text>
            <Text style={styles.dataValue}>{lane.kegOut || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Grippo SL</Text>
            <Text style={styles.dataValue}>{lane.grippoSL || 'N/A'}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Grippo Out</Text>
            <Text style={styles.dataValue}>{lane.grippoOut || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Shine</Text>
            <Text style={styles.dataValue}>{lane.shine || 'N/A'}</Text>
          </View>

          <View style={styles.dataItem} />
        </View>

        {lane.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.dataLabel}>Notes</Text>
            <Text style={styles.notesText}>{lane.notes}</Text>
          </View>
        ) : null}

        {/* Photos */}
        {title === 'Left Lane' && leftImageUrl ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/(modals)/photo-viewer',
                params: { url: leftImageUrl },
              })
            }
          >
            <Image source={{ uri: leftImageUrl }} style={styles.laneImage} />
          </TouchableOpacity>
        ) : null}

        {title === 'Right Lane' && rightImageUrl ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/(modals)/photo-viewer',
                params: { url: rightImageUrl },
              })
            }
          >
            <Image source={{ uri: rightImageUrl }} style={styles.laneImage} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const styles = getStyles(colors);

  if (!reading || !track) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reading Details</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={24}
              color="#FF3B30"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="flag.checkered"
              android_material_icon_name="sports-score"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{track.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{getDisplayDate(reading)}</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="access-time"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{getDisplayTime(reading)}</Text>
          </View>

          {reading.session ? (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>Session: {reading.session}</Text>
            </View>
          ) : null}

          {reading.pair ? (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="person.2"
                android_material_icon_name="group"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>Pair: {reading.pair}</Text>
            </View>
          ) : null}
        </View>
        {renderWeatherSnapshot(reading)}
        {renderLaneData(reading.leftLane, 'Left Lane')}
        {renderLaneData(reading.rightLane, 'Right Lane')}
      </ScrollView>
    </SafeAreaView>
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
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      marginRight: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 140,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoText: {
      fontSize: 16,
      color: colors.text,
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
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    dataItem: {
      flex: 1,
      marginHorizontal: 4,
    },
    dataLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
      fontWeight: '500',
    },
    dataValue: {
      fontSize: 18,
      color: colors.text,
      fontWeight: '600',
    },
    notesSection: {
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notesText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginTop: 4,
    },
    laneImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginTop: 16,
    },
  });
}