// utils/supabaseStorage.ts

import * as FileSystem from 'expo-file-system/legacy';
import { notifyReadingCreated } from './pushNotifications';
import { supabase, isSupabaseConfigured } from './supabase';
import { Track, TrackReading, LaneReading, TrackPhoto } from '@/types/TrackData';

export class SupabaseStorageService {
  private static safeNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private static decodeBase64(base64: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    let output = '';
    let index = 0;

    while (index < sanitized.length) {
      const enc1 = chars.indexOf(sanitized.charAt(index++));
      const enc2 = chars.indexOf(sanitized.charAt(index++));
      const enc3 = chars.indexOf(sanitized.charAt(index++));
      const enc4 = chars.indexOf(sanitized.charAt(index++));

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      output += String.fromCharCode(chr1);
      if (enc3 !== 64) output += String.fromCharCode(chr2);
      if (enc4 !== 64) output += String.fromCharCode(chr3);
    }

    return output;
  }

  private static base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = this.decodeBase64(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  private static guessImageExt(uri: string): string {
    const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = match?.[1]?.toLowerCase();
    return ext ?? 'jpg';
  }

  private static contentTypeFromExt(ext: string): string {
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'heic') return 'image/heic';
    if (ext === 'webp') return 'image/webp';
    return 'application/octet-stream';
  }

  private static getTrackDateFromTimestamp(ms: number, timeZone: string): string {
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
  }

  private static getYearFromTrackDate(trackDate: string | undefined, ms: number | null): number | undefined {
    if (trackDate && trackDate.length >= 4) {
      const y = Number(trackDate.slice(0, 4));
      if (Number.isFinite(y)) return y;
    }
    if (ms !== null) {
      const y = new Date(ms).getFullYear();
      if (Number.isFinite(y)) return y;
    }
    return undefined;
  }

  static async getAllTracks(): Promise<Track[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tracks:', error);
      return [];
    }

    return (data || []).map((track: any) => ({
      id: track.id,
      name: track.name,
      location: track.location,
      createdAt: new Date(track.created_at).getTime(),
    }));
  }

  static async createTrack(name: string, location: string): Promise<Track | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('tracks')
      .insert({ name, location, user_id: userData.user?.id })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating track:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      location: data.location,
      createdAt: new Date(data.created_at).getTime(),
    };
  }

  static async deleteTrack(trackId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data: trackPhotos, error: trackPhotosError } = await supabase.from('track_photos').select('photo_path').eq('track_id', trackId);
    if (trackPhotosError) {
      console.error('Error loading track photos for delete:', trackPhotosError);
      return false;
    }

    const { error: photosDeleteError } = await supabase.from('track_photos').delete().eq('track_id', trackId);
    if (photosDeleteError) {
      console.error('Error deleting track photos:', photosDeleteError);
      return false;
    }

    if (trackPhotos?.length) {
      const photoPaths = trackPhotos
        .map((photo: any) => photo.photo_path)
        .filter((photoPath: string | null): photoPath is string => !!photoPath);

      if (photoPaths.length) {
        const { error: storageDeleteError } = await supabase.storage.from('track-photos').remove(photoPaths);
        if (storageDeleteError) {
          console.error('Error deleting track photo storage:', storageDeleteError);
          return false;
        }
      }
    }

    const { error: readingsDeleteError } = await supabase.from('readings').delete().eq('track_id', trackId);
    if (readingsDeleteError) {
      console.error('Error deleting track readings:', readingsDeleteError);
      return false;
    }

    const { error } = await supabase.from('tracks').delete().eq('id', trackId);

    if (error) {
      console.error('Error deleting track:', error);
      return false;
    }

    return true;
  }

  static async getReadingsForTrack(trackId: string, year?: number): Promise<TrackReading[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('readings').select('*').eq('track_id', trackId).order('timestamp', { ascending: false });
    if (year !== undefined) query = query.eq('year', year);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching readings:', error);
      return [];
    }

    return (data || []).map((reading: any) => {
      const ts = this.safeNumber(reading.timestamp);
      const timeZone = reading.time_zone ?? undefined;

      const trackDate =
        reading.track_date ??
        reading.date ??
        (ts !== null ? this.getTrackDateFromTimestamp(ts, timeZone ?? 'UTC') : undefined);

      const dbYear = this.safeNumber(reading.year);
      const derivedYear = dbYear ?? this.getYearFromTrackDate(trackDate, ts);

      return {
        id: reading.id,
        trackId: reading.track_id,
        left_photo_path: reading.left_photo_path ?? null,
        right_photo_path: reading.right_photo_path ?? null,
        date: reading.date ?? trackDate ?? '',
        time: reading.time ?? '',
        timestamp: ts ?? 0,
        year: derivedYear ?? 0,
        session: reading.session ?? undefined,
        pair: reading.pair ?? undefined,
        classCurrentlyRunning: reading.class_currently_running ?? undefined,
        leftLane: reading.left_lane as LaneReading,
        rightLane: reading.right_lane as LaneReading,
        timeZone,
        trackDate,
        weather_ts: reading.weather_ts ?? undefined,
        temp_f: this.safeNumber(reading.temp_f) ?? undefined,
        humidity_pct: this.safeNumber(reading.humidity_pct) ?? undefined,
        baro_inhg: this.safeNumber(reading.baro_inhg) ?? undefined,
        adr: this.safeNumber(reading.adr) ?? undefined,
        correction: this.safeNumber(reading.correction) ?? undefined,
        davis_uv_index: this.safeNumber(reading.davis_uv_index) ?? undefined,
      };
    });
  }

  static async getReadingById(readingId: string): Promise<TrackReading | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('readings').select('*').eq('id', readingId).single();

    if (error || !data) {
      console.error('Error fetching reading:', error);
      return null;
    }

    const ts = this.safeNumber(data.timestamp);
    const timeZone = data.time_zone ?? undefined;

    const trackDate =
      data.track_date ??
      data.date ??
      (ts !== null ? this.getTrackDateFromTimestamp(ts, timeZone ?? 'UTC') : undefined);

    const dbYear = this.safeNumber(data.year);
    const derivedYear = dbYear ?? this.getYearFromTrackDate(trackDate, ts);

    return {
      id: data.id,
      trackId: data.track_id,
      left_photo_path: data.left_photo_path ?? null,
      right_photo_path: data.right_photo_path ?? null,
      date: data.date ?? trackDate ?? '',
      time: data.time ?? '',
      timestamp: ts ?? 0,
      year: derivedYear ?? 0,
      session: data.session ?? undefined,
      pair: data.pair ?? undefined,
      classCurrentlyRunning: data.class_currently_running ?? undefined,
      leftLane: data.left_lane as LaneReading,
      rightLane: data.right_lane as LaneReading,
      timeZone,
      trackDate,
      weather_ts: data.weather_ts ?? undefined,
      temp_f: this.safeNumber(data.temp_f) ?? undefined,
      humidity_pct: this.safeNumber(data.humidity_pct) ?? undefined,
      baro_inhg: this.safeNumber(data.baro_inhg) ?? undefined,
      adr: this.safeNumber(data.adr) ?? undefined,
      correction: this.safeNumber(data.correction) ?? undefined,
      davis_uv_index: this.safeNumber(data.davis_uv_index) ?? undefined,
    };
  }

  static async createReading(reading: Omit<TrackReading, 'id'>): Promise<TrackReading | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('readings')
      .insert({
        track_id: reading.trackId,
        date: reading.date,
        time: reading.time,
        timestamp: Math.trunc(reading.timestamp),
        year: reading.year,
        session: reading.session ?? null,
        pair: reading.pair ?? null,
        class_currently_running: reading.classCurrentlyRunning ?? null,
        left_lane: reading.leftLane,
        right_lane: reading.rightLane,
        user_id: userData.user?.id,
        time_zone: reading.timeZone ?? null,
        track_date: reading.trackDate ?? null,
        weather_ts: reading.weather_ts ?? null,
        temp_f: reading.temp_f ?? null,
        humidity_pct: reading.humidity_pct ?? null,
        baro_inhg: reading.baro_inhg ?? null,
        adr: reading.adr ?? null,
        correction: reading.correction ?? null,
        davis_uv_index: reading.davis_uv_index ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating reading:', error);
      return null;
    }

    try {
      await notifyReadingCreated(data.id);
    } catch (notificationError) {
      console.error('Reading saved, but notification delivery failed to start:', notificationError);
    }

    return this.getReadingById(data.id);
  }

  static async updateReading(readingId: string, updates: Partial<TrackReading>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const updateData: any = {};

    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.timestamp !== undefined) updateData.timestamp = Math.trunc(updates.timestamp);
    if (updates.year !== undefined) updateData.year = updates.year;
    if (updates.session !== undefined) updateData.session = updates.session ?? null;
    if (updates.pair !== undefined) updateData.pair = updates.pair ?? null;
    if (updates.classCurrentlyRunning !== undefined) updateData.class_currently_running = updates.classCurrentlyRunning ?? null;
    if (updates.leftLane !== undefined) updateData.left_lane = updates.leftLane;
    if (updates.rightLane !== undefined) updateData.right_lane = updates.rightLane;
    if (updates.timeZone !== undefined) updateData.time_zone = updates.timeZone ?? null;
    if (updates.trackDate !== undefined) updateData.track_date = updates.trackDate ?? null;
    if (updates.weather_ts !== undefined) updateData.weather_ts = updates.weather_ts;
    if (updates.temp_f !== undefined) updateData.temp_f = updates.temp_f;
    if (updates.humidity_pct !== undefined) updateData.humidity_pct = updates.humidity_pct;
    if (updates.baro_inhg !== undefined) updateData.baro_inhg = updates.baro_inhg;
    if (updates.adr !== undefined) updateData.adr = updates.adr;
    if (updates.correction !== undefined) updateData.correction = updates.correction;
    if (updates.davis_uv_index !== undefined) updateData.davis_uv_index = updates.davis_uv_index;

    const { error } = await supabase.from('readings').update(updateData).eq('id', readingId);

    if (error) {
      console.error('Error updating reading:', error);
      return false;
    }

    return true;
  }

  static async deleteReading(readingId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.from('readings').delete().eq('id', readingId);

    if (error) {
      console.error('Error deleting reading:', error);
      return false;
    }

    return true;
  }

  static async getAvailableYears(trackId?: string): Promise<number[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('readings').select('year').order('year', { ascending: false });
    if (trackId) query = query.eq('track_id', trackId);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available years:', error);
      return [];
    }

    return Array.from(
      new Set(
        (data ?? [])
          .map((r: any) => this.safeNumber(r.year))
          .filter((y: number | null): y is number => y !== null && y > 1900)
      )
    ).sort((a, b) => b - a);
  }

  static async getTrackPhotos(trackId?: string): Promise<TrackPhoto[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('track_photos').select('*').order('timestamp', { ascending: false });
    if (trackId) query = query.eq('track_id', trackId);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching track photos:', error);
      return [];
    }

    return (data || []).map((photo: any) => ({
      id: photo.id,
      trackId: photo.track_id,
      photoPath: photo.photo_path,
      timestamp: this.safeNumber(photo.timestamp) ?? 0,
      trackDate: photo.track_date ?? '',
      timeLabel: photo.time_label ?? '',
      timeZone: photo.time_zone ?? undefined,
      createdAt: new Date(photo.created_at).getTime(),
    }));
  }

  static async createTrackPhoto(params: {
    trackId: string;
    photoPath: string;
    timestamp: number;
    trackDate: string;
    timeLabel: string;
    timeZone?: string;
  }): Promise<TrackPhoto | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('track_photos')
      .insert({
        track_id: params.trackId,
        photo_path: params.photoPath,
        timestamp: Math.trunc(params.timestamp),
        track_date: params.trackDate,
        time_label: params.timeLabel,
        time_zone: params.timeZone ?? null,
        user_id: userData.user?.id,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating track photo:', error);
      return null;
    }

    return {
      id: data.id,
      trackId: data.track_id,
      photoPath: data.photo_path,
      timestamp: this.safeNumber(data.timestamp) ?? 0,
      trackDate: data.track_date ?? '',
      timeLabel: data.time_label ?? '',
      timeZone: data.time_zone ?? undefined,
      createdAt: new Date(data.created_at).getTime(),
    };
  }

  static async getSignedTrackPhotoUrl(objectPath: string, expiresInSeconds: number = 3600): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase.storage.from('track-photos').createSignedUrl(objectPath, expiresInSeconds);

    if (error) {
      console.error('Error creating track photo signed URL:', error);
      return null;
    }

    return data?.signedUrl ?? null;
  }

  static async uploadTrackPhoto(uri: string, trackId: string): Promise<string> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

    const BUCKET = 'track-photos';
    const ext = this.guessImageExt(uri);
    const contentType = this.contentTypeFromExt(ext);
    const fileName = `${Date.now()}.${ext}`;
    const objectPath = `tracks/${trackId}/${fileName}`;

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = this.base64ToUint8Array(base64);

      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
        contentType,
        upsert: true,
      });

      if (error) {
        console.error('Track photo upload error:', error);
        throw new Error(error.message || 'Track photo upload failed');
      }

      return objectPath;
    } catch (error) {
      console.error('Track photo upload exception:', error);
      if (error instanceof Error) throw error;
      throw new Error('Track photo upload failed');
    }
  }

  static async deleteTrackPhotoObject(objectPath: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.storage.from('track-photos').remove([objectPath]);

    if (error) {
      console.error('Track photo storage delete error:', error);
      return false;
    }

    return true;
  }

  static async deleteTrackPhoto(photoId: string, objectPath?: string | null): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.from('track_photos').delete().eq('id', photoId);

    if (error) {
      console.error('Error deleting track photo:', error);
      return false;
    }

    if (objectPath) {
      await this.deleteTrackPhotoObject(objectPath);
    }

    return true;
  }

  static async getSignedImageUrl(objectPath: string, expiresInSeconds: number = 3600): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase.storage.from('reading-photos').createSignedUrl(objectPath, expiresInSeconds);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data?.signedUrl ?? null;
  }

  static async getSignedUrlsForReading(params: {
    leftPhotoPath?: string | null;
    rightPhotoPath?: string | null;
    expiresInSeconds?: number;
  }): Promise<{ leftUrl: string | null; rightUrl: string | null }> {
    const { leftPhotoPath, rightPhotoPath, expiresInSeconds = 60 * 60 } = params;

    const [leftUrl, rightUrl] = await Promise.all([
      leftPhotoPath ? this.getSignedImageUrl(leftPhotoPath, expiresInSeconds) : Promise.resolve(null),
      rightPhotoPath ? this.getSignedImageUrl(rightPhotoPath, expiresInSeconds) : Promise.resolve(null),
    ]);

    return { leftUrl, rightUrl };
  }

  static async uploadImage(uri: string, readingId: string, lane: 'left' | 'right'): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const BUCKET = 'reading-photos';
    const ext = this.guessImageExt(uri);
    const contentType = this.contentTypeFromExt(ext);
    const fileName = `${lane}-${Date.now()}.${ext}`;
    const objectPath = `readings/${readingId}/${fileName}`;

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = this.base64ToUint8Array(base64);

      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
        contentType,
        upsert: true,
      });

      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }

      return objectPath;
    } catch (error) {
      console.error('Storage upload exception:', error);
      return null;
    }
  }

  static async deleteImage(objectPath: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.storage.from('reading-photos').remove([objectPath]);

    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }

    return true;
  }

  static async updateReadingPhotoPaths(params: {
    readingId: string;
    leftPhotoPath?: string | null;
    rightPhotoPath?: string | null;
  }): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const updateData: any = {};
    if (params.leftPhotoPath !== undefined) updateData.left_photo_path = params.leftPhotoPath;
    if (params.rightPhotoPath !== undefined) updateData.right_photo_path = params.rightPhotoPath;

    const { error } = await supabase.from('readings').update(updateData).eq('id', params.readingId);

    if (error) {
      console.error('Error updating photo paths:', error);
      return false;
    }

    return true;
  }
}
