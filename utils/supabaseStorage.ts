// utils/supabaseStorage.ts

import { supabase, isSupabaseConfigured } from './supabase';
import { Track, TrackReading, LaneReading } from '@/types/TrackData';

export class SupabaseStorageService {
  // ============================================
  // TRACK-LOCAL DATE/TIME HELPERS (no extra deps)
  // ============================================

  private static safeNumber(value: any): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private static getTrackDateFromTimestamp(ms: number, timeZone: string): string {
    // returns YYYY-MM-DD
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
      // fallback: device-local
      const d = new Date(ms);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  private static getYearFromTrackDate(trackDate: string | undefined, ms: number | null): number | undefined {
    // Prefer trackDate’s year so it matches the “track-local forever” intent
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

  // ============================================
  // TRACKS
  // ============================================

  static async getAllTracks(): Promise<Track[]> {
    console.log('SupabaseStorageService: Fetching all tracks');

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return [];
    }

    try {
      const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks:', error);
        if ((error as any).code === '42P17') {
          console.log('RLS policy error detected - this should be fixed now. Please restart the app.');
        }
        return [];
      }

      console.log('Fetched tracks:', data?.length || 0);

      return (data || []).map((track: any) => ({
        id: track.id,
        name: track.name,
        location: track.location,
        createdAt: new Date(track.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Exception fetching tracks:', error);
      return [];
    }
  }

  static async createTrack(name: string, location: string): Promise<Track | null> {
    console.log('SupabaseStorageService: Creating track:', name, location);

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tracks')
        .insert({
          name,
          location,
          user_id: userData.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating track:', error);
        return null;
      }

      console.log('Track created successfully:', data.id);

      return {
        id: data.id,
        name: data.name,
        location: data.location,
        createdAt: new Date(data.created_at).getTime(),
      };
    } catch (error) {
      console.error('Exception creating track:', error);
      return null;
    }
  }

  static async deleteTrack(trackId: string): Promise<boolean> {
    console.log('SupabaseStorageService: Deleting track:', trackId);

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return false;
    }

    try {
      await supabase.from('readings').delete().eq('track_id', trackId);

      const { error } = await supabase.from('tracks').delete().eq('id', trackId);

      if (error) {
        console.error('Error deleting track:', error);
        return false;
      }

      console.log('Track deleted successfully');
      return true;
    } catch (error) {
      console.error('Exception deleting track:', error);
      return false;
    }
  }

  // ============================================
  // READINGS
  // ============================================

  static async getReadingsForTrack(trackId: string, year?: number): Promise<TrackReading[]> {
    console.log('SupabaseStorageService: Fetching readings for track:', trackId, 'year:', year);

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return [];
    }

    try {
      let query = supabase.from('readings').select('*').eq('track_id', trackId).order('timestamp', { ascending: false });

      if (year !== undefined) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching readings:', error);
        return [];
      }

      console.log('Fetched readings:', data?.length || 0);

      return (data || []).map((reading: any) => {
        const ts = this.safeNumber(reading.timestamp);
        const timeZone: string | undefined = reading.time_zone ?? undefined;

        const trackDate: string | undefined =
          reading.track_date ?? reading.date ?? (ts !== null ? this.getTrackDateFromTimestamp(ts, timeZone ?? 'UTC') : undefined);

        const dbYear = this.safeNumber(reading.year);
        const derivedYear = dbYear ?? this.getYearFromTrackDate(trackDate, ts);

        return {
          id: reading.id,
          trackId: reading.track_id,

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
        };
      });
    } catch (error) {
      console.error('Exception fetching readings:', error);
      return [];
    }
  }

  static async createReading(reading: Omit<TrackReading, 'id'>): Promise<TrackReading | null> {
    console.log('SupabaseStorageService: Creating reading for track:', reading.trackId);

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const timestamp = Math.trunc(reading.timestamp);

      const { data, error } = await supabase
        .from('readings')
        .insert({
          track_id: reading.trackId,
          date: reading.date,
          time: reading.time,
          timestamp,
          year: reading.year,
          session: reading.session ?? null,
          pair: reading.pair ?? null,
          class_currently_running: reading.classCurrentlyRunning ?? null,
          left_lane: reading.leftLane,
          right_lane: reading.rightLane,
          user_id: userData.user?.id,
          time_zone: reading.timeZone ?? null,
          track_date: reading.trackDate ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating reading:', error);
        return null;
      }

      console.log('Reading created successfully:', data.id);

      const ts = this.safeNumber(data.timestamp) ?? timestamp;

      return {
        id: data.id,
        trackId: data.track_id,
        date: data.date,
        time: data.time,
        timestamp: ts,
        year: this.safeNumber(data.year) ?? reading.year,
        session: data.session ?? undefined,
        pair: data.pair ?? undefined,
        classCurrentlyRunning: data.class_currently_running ?? undefined,
        leftLane: data.left_lane as LaneReading,
        rightLane: data.right_lane as LaneReading,
        timeZone: data.time_zone ?? undefined,
        trackDate: data.track_date ?? undefined,
      };
    } catch (error) {
      console.error('Exception creating reading:', error);
      return null;
    }
  }

  static async updateReading(readingId: string, updates: Partial<TrackReading>): Promise<boolean> {
    console.log('SupabaseStorageService: Updating reading:', readingId);

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return false;
    }

    try {
      const updateData: any = {};

      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.time !== undefined) updateData.time = updates.time;
      if (updates.timestamp !== undefined) updateData.timestamp = Math.trunc(updates.timestamp);
      if (updates.year !== undefined) updateData.year = updates.year;

      if (updates.session !== undefined) updateData.session = updates.session;
      if (updates.pair !== undefined) updateData.pair = updates.pair;

      if (updates.classCurrentlyRunning !== undefined) updateData.class_currently_running = updates.classCurrentlyRunning;
      if (updates.leftLane !== undefined) updateData.left_lane = updates.leftLane;
      if (updates.rightLane !== undefined) updateData.right_lane = updates.rightLane;

      if (updates.timeZone !== undefined) updateData.time_zone = updates.timeZone;
      if (updates.trackDate !== undefined) updateData.track_date = updates.trackDate;

      const { error } = await supabase.from('readings').update(updateData).eq('id', readingId);

      if (error) {
        console.error('Error updating reading:', error);
        return false;
      }

      console.log('Reading updated successfully');
      return true;
    } catch (error) {
      console.error('Exception updating reading:', error);
      return false;
    }
  }

  static async deleteReading(readingId: string): Promise<boolean> {
    console.log('SupabaseStorageService: Deleting reading:', readingId);

    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase.from('readings').delete().eq('id', readingId);

      if (error) {
        console.error('Error deleting reading:', error);
        return false;
      }

      console.log('Reading deleted successfully');
      return true;
    } catch (error) {
      console.error('Exception deleting reading:', error);
      return false;
    }
  }

  // ============================================
  // IMAGE UPLOAD (REAL SUPABASE STORAGE)
  // ============================================

  static async uploadImage(uri: string, readingId: string, lane: 'left' | 'right'): Promise<string | null> {
  console.log('SupabaseStorageService: Uploading image for reading:', readingId, 'lane:', lane);

  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured');
    return null;
  }

  try {
    const BUCKET = 'reading-photos';

    // Guess extension/content-type
    const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = (match?.[1] || 'jpg').toLowerCase();

    const contentType =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
        ? 'image/png'
        : ext === 'heic'
        ? 'image/heic'
        : 'application/octet-stream';

    const fileName = `${lane}-${Date.now()}.${ext}`;
    const objectPath = `readings/${readingId}/${fileName}`;

    // Modern Expo-friendly upload: fetch local uri -> blob
    const res = await fetch(uri);
    if (!res.ok) {
      console.error('Failed to fetch local image uri:', uri, 'status:', res.status);
      return null;
    }

    const blob = await res.blob();

    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, blob, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    console.log('Uploaded image to:', objectPath);
    return objectPath;
  } catch (error) {
    console.error('Exception uploading image:', error);
    return null;
  }
}

     

  /**
   * Step 3 helper: store uploaded photo paths onto the reading row.
   * You must add these columns first (SQL below).
   */
  static async updateReadingPhotoPaths(params: {
    readingId: string;
    leftPhotoPath?: string | null;
    rightPhotoPath?: string | null;
  }): Promise<boolean> {
    const { readingId, leftPhotoPath, rightPhotoPath } = params;

    if (!isSupabaseConfigured()) return false;

    try {
      const updateData: any = {};
      if (leftPhotoPath !== undefined) updateData.left_photo_path = leftPhotoPath;
      if (rightPhotoPath !== undefined) updateData.right_photo_path = rightPhotoPath;

      const { error } = await supabase.from('readings').update(updateData).eq('id', readingId);
      if (error) {
        console.error('Error updating photo paths:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception updating photo paths:', e);
      return false;
    }
  }
}