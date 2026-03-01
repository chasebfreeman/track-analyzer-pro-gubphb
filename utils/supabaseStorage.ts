// utils/supabaseStorage.ts

import { supabase, isSupabaseConfigured } from './supabase';
import { Track, TrackReading, LaneReading } from '@/types/TrackData';

export class SupabaseStorageService {

  // ============================================
  // UTIL HELPERS
  // ============================================

  private static safeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

  private static getTrackDateFromTimestamp(ms: number, timeZone: string): string {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date(ms));

      const y = parts.find(p => p.type === 'year')?.value ?? '0000';
      const m = parts.find(p => p.type === 'month')?.value ?? '00';
      const d = parts.find(p => p.type === 'day')?.value ?? '00';

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

  // ============================================
  // TRACKS
  // ============================================

  static async getAllTracks(): Promise<Track[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

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
      .insert({
        name,
        location,
        user_id: userData.user?.id,
      })
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

    await supabase.from('readings').delete().eq('track_id', trackId);
    const { error } = await supabase.from('tracks').delete().eq('id', trackId);

    if (error) {
      console.error('Error deleting track:', error);
      return false;
    }

    return true;
  }

  // ============================================
  // READINGS
  // ============================================

  static async getReadingsForTrack(trackId: string, year?: number): Promise<TrackReading[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('readings')
      .select('*')
      .eq('track_id', trackId)
      .order('timestamp', { ascending: false });

    if (year !== undefined) {
      query = query.eq('year', year);
    }

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

        // ✅ Weather snapshot
        temp_f: this.safeNumber(reading.temp_f) ?? undefined,
        humidity_pct: this.safeNumber(reading.humidity_pct) ?? undefined,
        baro_inhg: this.safeNumber(reading.baro_inhg) ?? undefined,
        adr: this.safeNumber(reading.adr) ?? undefined,
        correction: this.safeNumber(reading.correction) ?? undefined,
        weather_ts: reading.weather_ts ?? undefined,
        uv_index: this.safeNumber(reading.uv_index) ?? undefined,
      };
    });
  }

  static async getReadingById(readingId: string): Promise<TrackReading | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('id', readingId)
      .single();

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

  // ✅ Weather snapshot
  temp_f: this.safeNumber(data.temp_f) ?? undefined,
  humidity_pct: this.safeNumber(data.humidity_pct) ?? undefined,
  baro_inhg: this.safeNumber(data.baro_inhg) ?? undefined,
  adr: this.safeNumber(data.adr) ?? undefined,
  correction: this.safeNumber(data.correction) ?? undefined,
  weather_ts: data.weather_ts ?? undefined,
  uv_index: this.safeNumber(data.uv_index) ?? undefined,
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

      // ✅ NEW: weather snapshot fields
      temp_f: reading.temp_f ?? null,
      humidity_pct: reading.humidity_pct ?? null,
      baro_inhg: reading.baro_inhg ?? null,
      adr: reading.adr ?? null,
      correction: reading.correction ?? null,
      weather_ts: reading.weather_ts ?? null,
      uv_index: reading.uv_index ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating reading:', error);
    return null;
  }

  return this.getReadingById(data.id);
}

  static async updateReading(
  readingId: string,
  updates: Partial<TrackReading>
): Promise<TrackReading | null> {
  if (!isSupabaseConfigured()) return null;

  const updateData: any = {};

  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.time !== undefined) updateData.time = updates.time;
  if (updates.timestamp !== undefined) updateData.timestamp = Math.trunc(updates.timestamp);
  if (updates.year !== undefined) updateData.year = updates.year;
  if (updates.session !== undefined) updateData.session = updates.session ?? null;
  if (updates.pair !== undefined) updateData.pair = updates.pair ?? null;
  if (updates.classCurrentlyRunning !== undefined)
    updateData.class_currently_running = updates.classCurrentlyRunning ?? null;

  if (updates.leftLane !== undefined) updateData.left_lane = updates.leftLane;
  if (updates.rightLane !== undefined) updateData.right_lane = updates.rightLane;

  if (updates.timeZone !== undefined) updateData.time_zone = updates.timeZone ?? null;
  if (updates.trackDate !== undefined) updateData.track_date = updates.trackDate ?? null;

  // weather snapshot fields
  if (updates.temp_f !== undefined) updateData.temp_f = updates.temp_f ?? null;
  if (updates.humidity_pct !== undefined) updateData.humidity_pct = updates.humidity_pct ?? null;
  if (updates.baro_inhg !== undefined) updateData.baro_inhg = updates.baro_inhg ?? null;
  if (updates.adr !== undefined) updateData.adr = updates.adr ?? null;
  if (updates.correction !== undefined) updateData.correction = updates.correction ?? null;
  if (updates.weather_ts !== undefined) updateData.weather_ts = updates.weather_ts ?? null;
  if (updates.uv_index !== undefined) updateData.uv_index = updates.uv_index ?? null;

  const { error } = await supabase.from("readings").update(updateData).eq("id", readingId);

  if (error) {
    console.error("Error updating reading:", error);
    return null;
  }

  // Return the updated row in app-friendly shape
  return await this.getReadingById(readingId);
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

  // ============================================
  // STORAGE (SIGNED URLS + UPLOAD)
  // ============================================

  static async getSignedImageUrl(
  objectPath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  if (!objectPath) {
    console.log("[Storage] getSignedImageUrl called with empty path");
    return null;
  }

  const { data, error } = await supabase.storage
    .from("reading-photos")
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error) {
    console.error("[Storage] createSignedUrl error:", {
      message: error.message,
      name: (error as any).name,
      status: (error as any).status,
      code: (error as any).code,
      objectPath,
    });
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

    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();

    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' :
      'application/octet-stream';

    const fileName = `${lane}-${Date.now()}.${ext}`;
    const objectPath = `readings/${readingId}/${fileName}`;

    const res = await fetch(uri);
    const blob = await res.blob();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, blob, { contentType, upsert: true });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    return objectPath;
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