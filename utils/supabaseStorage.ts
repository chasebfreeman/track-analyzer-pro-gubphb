
import { supabase, isSupabaseConfigured } from './supabase';
import { Track, TrackReading, LaneReading } from '@/types/TrackData';

export class SupabaseStorageService {
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
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks:', error);
        // If we get a policy error, it might be a temporary issue - return empty array
        if (error.code === '42P17') {
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
      // First delete all readings for this track
      await supabase
        .from('readings')
        .delete()
        .eq('track_id', trackId);

      // Then delete the track
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

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
      let query = supabase
        .from('readings')
        .select('*')
        .eq('track_id', trackId)
        .order('timestamp', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching readings:', error);
        return [];
      }

      console.log('Fetched readings:', data?.length || 0);

      return (data || []).map((reading: any) => ({
        id: reading.id,
        trackId: reading.track_id,
        date: reading.date,
        time: reading.time,
        timestamp: Number(reading.timestamp),
        year: reading.year,
        classCurrentlyRunning: reading.class_currently_running,
        leftLane: reading.left_lane as LaneReading,
        rightLane: reading.right_lane as LaneReading,
      }));
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

      const { data, error } = await supabase
        .from('readings')
        .insert({
          track_id: reading.trackId,
          date: reading.date,
          time: reading.time,
          timestamp: reading.timestamp,
          year: reading.year,
          class_currently_running: reading.classCurrentlyRunning,
          left_lane: reading.leftLane,
          right_lane: reading.rightLane,
          user_id: userData.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating reading:', error);
        return null;
      }

      console.log('Reading created successfully:', data.id);

      return {
        id: data.id,
        trackId: data.track_id,
        date: data.date,
        time: data.time,
        timestamp: Number(data.timestamp),
        year: data.year,
        classCurrentlyRunning: data.class_currently_running,
        leftLane: data.left_lane as LaneReading,
        rightLane: data.right_lane as LaneReading,
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
      
      if (updates.date) updateData.date = updates.date;
      if (updates.time) updateData.time = updates.time;
      if (updates.timestamp) updateData.timestamp = updates.timestamp;
      if (updates.year) updateData.year = updates.year;
      if (updates.classCurrentlyRunning !== undefined) {
        updateData.class_currently_running = updates.classCurrentlyRunning;
      }
      if (updates.leftLane) updateData.left_lane = updates.leftLane;
      if (updates.rightLane) updateData.right_lane = updates.rightLane;

      const { error } = await supabase
        .from('readings')
        .update(updateData)
        .eq('id', readingId);

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
      const { error } = await supabase
        .from('readings')
        .delete()
        .eq('id', readingId);

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
  // UTILITY METHODS
  // ============================================

  static async getAvailableYears(trackId?: string): Promise<number[]> {
    console.log('SupabaseStorageService: Fetching available years for track:', trackId);
    
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return [];
    }

    try {
      let query = supabase
        .from('readings')
        .select('year');

      if (trackId) {
        query = query.eq('track_id', trackId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching years:', error);
        // If we get a policy error, it might be a temporary issue - return empty array
        if (error.code === '42P17') {
          console.log('RLS policy error detected - this should be fixed now. Please restart the app.');
        }
        return [];
      }

      const years = [...new Set((data || []).map((r: any) => r.year))].sort((a, b) => b - a);
      console.log('Available years:', years);
      return years;
    } catch (error) {
      console.error('Exception fetching years:', error);
      return [];
    }
  }

  // ============================================
  // IMAGE UPLOAD
  // ============================================

  static async uploadImage(uri: string, trackId: string, lane: 'left' | 'right'): Promise<string | null> {
    console.log('SupabaseStorageService: Uploading image for track:', trackId, 'lane:', lane);
    
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return null;
    }

    try {
      // For now, we'll store the local URI
      // In a production app, you'd upload to Supabase Storage
      // and return the public URL
      console.log('Image stored locally:', uri);
      return uri;
    } catch (error) {
      console.error('Exception uploading image:', error);
      return null;
    }
  }
}
