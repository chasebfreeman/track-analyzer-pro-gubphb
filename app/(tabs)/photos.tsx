// app/(tabs)/photos.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useThemeColors } from '@/styles/commonStyles';
import { Track, TrackPhoto } from '@/types/TrackData';
import { SupabaseStorageService } from '@/utils/supabaseStorage';

type TrackPhotoWithUrl = TrackPhoto & { signedUrl: string | null };
type PickerMode = 'date' | 'time' | null;

const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

const timeLabelString = (ms: number, timeZone: string) => {
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

const displayStamp = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${month}/${day}/${year} @ ${hours}:${minutes}${ampm.toLowerCase()}`;
};

const mergePickerValue = (current: Date, value: Date, mode: PickerMode) => {
  const next = new Date(current);
  if (mode === 'date') {
    next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
  } else if (mode === 'time') {
    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
  }
  return next;
};

export default function PhotosScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [photos, setPhotos] = useState<TrackPhotoWithUrl[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickerDraftDate, setPickerDraftDate] = useState(new Date());
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);
  const [showImageActions, setShowImageActions] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTracks = useCallback(async () => {
    const allTracks = await SupabaseStorageService.getAllTracks();
    const sorted = allTracks.sort((a, b) => a.name.localeCompare(b.name));
    setTracks(sorted);
    setSelectedTrack((current) => current ?? sorted[0] ?? null);
  }, []);

  const loadPhotos = useCallback(async (trackId?: string) => {
    if (!trackId) {
      setPhotos([]);
      return;
    }

    const items = await SupabaseStorageService.getTrackPhotos(trackId);
    const withUrls = await Promise.all(
      items.map(async (photo) => ({
        ...photo,
        signedUrl: await SupabaseStorageService.getSignedTrackPhotoUrl(photo.photoPath, 60 * 60),
      }))
    );
    setPhotos(withUrls);
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useFocusEffect(
    useCallback(() => {
      loadTracks();
    }, [loadTracks])
  );

  useEffect(() => {
    loadPhotos(selectedTrack?.id);
  }, [loadPhotos, selectedTrack?.id]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await loadTracks();
      await loadPhotos(selectedTrack?.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openPicker = (mode: PickerMode) => {
    setPickerDraftDate(selectedDate);
    setPickerMode(mode);
  };

  const closePicker = () => {
    setPickerMode(null);
  };

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackDropdown(false);
  };

  const pickFromLibrary = async () => {
    setShowImageActions(false);
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
      setPendingImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowImageActions(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
    }
  };

  const onChangePicker = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === 'dismissed') {
      closePicker();
      return;
    }
    if (!value || !pickerMode) return;

    if (Platform.OS === 'ios') {
      setPickerDraftDate((current) => mergePickerValue(current, value, pickerMode));
      return;
    }

    setSelectedDate((current) => mergePickerValue(current, value, pickerMode));
    closePicker();
  };

  const applyPicker = () => {
    setSelectedDate(pickerDraftDate);
    closePicker();
  };

  const handleSavePhoto = async () => {
    if (!selectedTrack) {
      Alert.alert('Missing Track', 'Please choose a track first.');
      return;
    }
    if (!pendingImageUri) {
      Alert.alert('Missing Photo', 'Choose or take a photo before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const timeZone = getDeviceTimeZone();
      const timestamp = selectedDate.getTime();
      const photoPath = await SupabaseStorageService.uploadTrackPhoto(pendingImageUri, selectedTrack.id);


      const saved = await SupabaseStorageService.createTrackPhoto({
        trackId: selectedTrack.id,
        photoPath,
        timestamp,
        trackDate: trackDateString(timestamp, timeZone),
        timeLabel: timeLabelString(timestamp, timeZone),
        timeZone,
      });

      if (!saved) {
        await SupabaseStorageService.deleteTrackPhotoObject(photoPath);
        Alert.alert('Error', 'Could not save photo details.');
        return;
      }

      setPendingImageUri(null);
      await loadPhotos(selectedTrack.id);
      Alert.alert('Saved', 'Track photo saved.');
    } catch (error) {
      console.error('Save photo error:', error);
      const message = error instanceof Error ? error.message : 'Failed to save photo.';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePhoto = (photo: TrackPhotoWithUrl) => {
    Alert.alert('Delete Photo', 'Remove this photo from the track photo log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await SupabaseStorageService.deleteTrackPhoto(photo.id, photo.photoPath);
          if (!ok) {
            Alert.alert('Error', 'Failed to delete photo.');
            return;
          }
          await loadPhotos(selectedTrack?.id);
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Track Photos</Text>
          <Text style={styles.headerSubtitle}>Upload photos separately and stamp them with the track, date, and time.</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Track</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowTrackDropdown(true)}>
              <Text style={styles.dropdownButtonText}>{selectedTrack ? selectedTrack.name : 'Choose a track...'}</Text>
              <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, styles.metaTitle]}>Photo Timestamp</Text>
            <View style={styles.metaRow}>
              <TouchableOpacity style={styles.metaButton} onPress={() => openPicker('date')}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={18} color={colors.primary} />
                <Text style={styles.metaButtonText}>{selectedDate.toLocaleDateString('en-US')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.metaButton} onPress={() => openPicker('time')}>
                <IconSymbol ios_icon_name="clock" android_material_icon_name="access-time" size={18} color={colors.primary} />
                <Text style={styles.metaButtonText}>{selectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timestampPreview}>{displayStamp(selectedDate)}</Text>

            <View style={styles.uploadActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowImageActions(true)}>
                <IconSymbol ios_icon_name="camera" android_material_icon_name="add-a-photo" size={20} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>{pendingImageUri ? 'Change Photo' : 'Add Photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (!pendingImageUri || isSaving) && styles.primaryButtonDisabled]}
                onPress={handleSavePhoto}
                disabled={!pendingImageUri || isSaving}
              >
                <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Photo'}</Text>
              </TouchableOpacity>
            </View>

            {pendingImageUri ? <Image source={{ uri: pendingImageUri }} style={styles.pendingImage} contentFit="cover" /> : null}
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Saved Photos</Text>
            <Text style={styles.listCount}>{photos.length}</Text>
          </View>

          {photos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptyText}>Pick a track, add a photo, and stamp it with the date and time.</Text>
            </View>
          ) : (
            photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => photo.signedUrl && router.push({ pathname: '/(modals)/photo-viewer', params: { url: encodeURIComponent(photo.signedUrl) } })}
                >
                  {photo.signedUrl ? (
                    <Image source={{ uri: photo.signedUrl }} style={styles.photoImage} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <View style={[styles.photoImage, styles.photoImageFallback]}>
                      <Text style={styles.photoImageFallbackText}>Preview unavailable</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.photoMetaHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.photoTrackName}>{selectedTrack?.name ?? 'Track Photo'}</Text>
                    <Text style={styles.photoMetaText}>{`${photo.trackDate} @ ${photo.timeLabel}`}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteIconButton} onPress={() => handleDeletePhoto(photo)}>
                    <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={showTrackDropdown} transparent animationType="fade" onRequestClose={() => setShowTrackDropdown(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTrackDropdown(false)}>
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Track</Text>
                <TouchableOpacity onPress={() => setShowTrackDropdown(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.dropdownList}>
                {tracks.map((track) => (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.dropdownItem, selectedTrack?.id === track.id && styles.dropdownItemActive]}
                    onPress={() => handleTrackSelect(track)}
                  >
                    <Text style={[styles.dropdownItemText, selectedTrack?.id === track.id && styles.dropdownItemTextActive]}>{track.name}</Text>
                    {selectedTrack?.id === track.id ? (
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showImageActions} transparent animationType="fade" onRequestClose={() => setShowImageActions(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowImageActions(false)}>
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Photo</Text>
                <TouchableOpacity onPress={() => setShowImageActions(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.actionList}>
                <TouchableOpacity style={styles.actionRow} onPress={takePhoto}>
                  <IconSymbol ios_icon_name="camera" android_material_icon_name="photo-camera" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRow} onPress={pickFromLibrary}>
                  <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {pickerMode && Platform.OS === 'ios' ? (
          <Modal visible transparent animationType="fade" onRequestClose={closePicker}>
            <View style={styles.modalOverlay}>
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={styles.pickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>{pickerMode === 'date' ? 'Choose Date' : 'Choose Time'}</Text>
                  <TouchableOpacity onPress={applyPicker}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker value={pickerDraftDate} mode={pickerMode} display="spinner" onChange={onChangePicker} />
              </View>
            </View>
          </Modal>
        ) : null}

        {pickerMode && Platform.OS !== 'ios' ? (
          <DateTimePicker value={selectedDate} mode={pickerMode} display="default" onChange={onChangePicker} />
        ) : null}
      </SafeAreaView>
    </>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 30, fontWeight: '700', color: colors.text },
    headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
    content: { flex: 1 },
    contentContainer: { padding: 20, paddingBottom: 140 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
    metaTitle: { marginTop: 18 },
    dropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownButtonText: { fontSize: 16, color: colors.text, fontWeight: '500' },
    metaRow: { flexDirection: 'row', gap: 12 },
    metaButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    metaButtonText: { color: colors.text, fontSize: 15, fontWeight: '500' },
    timestampPreview: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
    uploadActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
    },
    secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    primaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
    },
    primaryButtonDisabled: { opacity: 0.55 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    pendingImage: { width: '100%', height: 220, borderRadius: 14, marginTop: 16 },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    listCount: {
      minWidth: 32,
      textAlign: 'center',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.card,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    emptyCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 },
    emptyText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    photoCard: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 16 },
    photoImage: { width: '100%', height: 220, borderRadius: 12, backgroundColor: colors.background },
    photoImageFallback: { alignItems: 'center', justifyContent: 'center' },
    photoImageFallbackText: { color: colors.textSecondary, fontSize: 14 },
    photoMetaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    photoTrackName: { fontSize: 16, fontWeight: '600', color: colors.text },
    photoMetaText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    deleteIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dropdownModal: { backgroundColor: colors.card, borderRadius: 16, width: '100%', maxHeight: '70%', overflow: 'hidden' },
    dropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
    dropdownList: { maxHeight: 400 },
    dropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemActive: { backgroundColor: colors.background },
    dropdownItemText: { fontSize: 16, color: colors.text },
    dropdownItemTextActive: { fontWeight: '600', color: colors.primary },
    actionList: { paddingHorizontal: 16, paddingVertical: 8 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    actionText: { fontSize: 16, fontWeight: '600', color: colors.text },
    pickerModal: { width: '100%', backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    pickerCancelText: { fontSize: 16, color: colors.textSecondary },
    pickerDoneText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  });
}
