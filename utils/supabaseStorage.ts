
import { supabase, isSupabaseConfigured } from './supabase';
import { Track, TrackReading } from '@/types/TrackData';
import { StorageService } from './storage';

export const SupabaseStorageService = {
  // Check if we should use Supabase or fall back to local storage
  isEnabled: () => isSupabaseConfigured(),

  // Track operations
  async getTracks(): Promise<Track[]> {
    if (!this.isEnabled()) {
      return StorageService.getTracks();
    }

    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks from Supabase:', error);
        return StorageService.getTracks();
      }

      return data.map(track => ({
        id: track.id,
        name: track.name,
        location: track.location,
        createdAt: new Date(track.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Error getting tracks:', error);
      return StorageService.getTracks();
    }
  },

  async saveTrack(track: Track): Promise<void> {
    if (!this.isEnabled()) {
      return StorageService.saveTrack(track);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('tracks')
        .upsert({
          id: track.id,
          name: track.name,
          location: track.location,
          created_at: new Date(track.createdAt).toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving track to Supabase:', error);
        throw error;
      }

      console.log('Track saved to Supabase successfully:', track.name);
    } catch (error) {
      console.error('Error saving track:', error);
      throw error;
    }
  },

  async deleteTrack(trackId: string): Promise<void> {
    if (!this.isEnabled()) {
      return StorageService.deleteTrack(trackId);
    }

    try {
      // Delete track (readings will be cascade deleted)
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) {
        console.error('Error deleting track from Supabase:', error);
        throw error;
      }

      console.log('Track deleted from Supabase successfully:', trackId);
    } catch (error) {
      console.error('Error deleting track:', error);
      throw error;
    }
  },

  // Reading operations
  async getReadings(): Promise<TrackReading[]> {
    if (!this.isEnabled()) {
      return StorageService.getReadings();
    }

    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching readings from Supabase:', error);
        return StorageService.getReadings();
      }

      return data.map(reading => ({
        id: reading.id,
        trackId: reading.track_id,
        date: reading.date,
        time: reading.time,
        timestamp: reading.timestamp,
        year: reading.year,
        classCurrentlyRunning: reading.class_currently_running,
        leftLane: reading.left_lane,
        rightLane: reading.right_lane,
      }));
    } catch (error) {
      console.error('Error getting readings:', error);
      return StorageService.getReadings();
    }
  },

  async getReadingsByTrack(trackId: string): Promise<TrackReading[]> {
    if (!this.isEnabled()) {
      return StorageService.getReadingsByTrack(trackId);
    }

    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('track_id', trackId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching readings by track from Supabase:', error);
        return StorageService.getReadingsByTrack(trackId);
      }

      return data.map(reading => ({
        id: reading.id,
        trackId: reading.track_id,
        date: reading.date,
        time: reading.time,
        timestamp: reading.timestamp,
        year: reading.year,
        classCurrentlyRunning: reading.class_currently_running,
        leftLane: reading.left_lane,
        rightLane: reading.right_lane,
      }));
    } catch (error) {
      console.error('Error getting readings by track:', error);
      return StorageService.getReadingsByTrack(trackId);
    }
  },

  async getReadingsByTrackAndYear(trackId: string, year: number): Promise<TrackReading[]> {
    if (!this.isEnabled()) {
      return StorageService.getReadingsByTrackAndYear(trackId, year);
    }

    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('track_id', trackId)
        .eq('year', year)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching readings by track and year from Supabase:', error);
        return StorageService.getReadingsByTrackAndYear(trackId, year);
      }

      return data.map(reading => ({
        id: reading.id,
        trackId: reading.track_id,
        date: reading.date,
        time: reading.time,
        timestamp: reading.timestamp,
        year: reading.year,
        classCurrentlyRunning: reading.class_currently_running,
        leftLane: reading.left_lane,
        rightLane: reading.right_lane,
      }));
    } catch (error) {
      console.error('Error getting readings by track and year:', error);
      return StorageService.getReadingsByTrackAndYear(trackId, year);
    }
  },

  async getAvailableYears(): Promise<number[]> {
    if (!this.isEnabled()) {
      return StorageService.getAvailableYears();
    }

    try {
      const { data, error } = await supabase
        .from('readings')
        .select('year')
        .order('year', { ascending: false });

      if (error) {
        console.error('Error fetching available years from Supabase:', error);
        return StorageService.getAvailableYears();
      }

      const years = new Set<number>();
      data.forEach(reading => {
        if (reading.year) {
          years.add(reading.year);
        }
      });
      return Array.from(years).sort((a, b) => b - a);
    } catch (error) {
      console.error('Error getting available years:', error);
      return StorageService.getAvailableYears();
    }
  },

  async getAvailableYearsForTrack(trackId: string): Promise<number[]> {
    if (!this.isEnabled()) {
      return StorageService.getAvailableYearsForTrack(trackId);
    }

    try {
      const { data, error } = await supabase
        .from('readings')
        .select('year')
        .eq('track_id', trackId)
        .order('year', { ascending: false });

      if (error) {
        console.error('Error fetching available years for track from Supabase:', error);
        return StorageService.getAvailableYearsForTrack(trackId);
      }

      const years = new Set<number>();
      data.forEach(reading => {
        if (reading.year) {
          years.add(reading.year);
        }
      });
      return Array.from(years).sort((a, b) => b - a);
    } catch (error) {
      console.error('Error getting available years for track:', error);
      return StorageService.getAvailableYearsForTrack(trackId);
    }
  },

  async saveReading(reading: TrackReading): Promise<void> {
    if (!this.isEnabled()) {
      return StorageService.saveReading(reading);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('readings')
        .upsert({
          id: reading.id,
          track_id: reading.trackId,
          date: reading.date,
          time: reading.time,
          timestamp: reading.timestamp,
          year: reading.year,
          class_currently_running: reading.classCurrentlyRunning,
          left_lane: reading.leftLane,
          right_lane: reading.rightLane,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving reading to Supabase:', error);
        throw error;
      }

      console.log('Reading saved to Supabase successfully:', reading.id);
    } catch (error) {
      console.error('Error saving reading:', error);
      throw error;
    }
  },

  async deleteReading(readingId: string): Promise<void> {
    if (!this.isEnabled()) {
      return StorageService.deleteReading(readingId);
    }

    try {
      const { error } = await supabase
        .from('readings')
        .delete()
        .eq('id', readingId);

      if (error) {
        console.error('Error deleting reading from Supabase:', error);
        throw error;
      }

      console.log('Reading deleted from Supabase successfully:', readingId);
    } catch (error) {
      console.error('Error deleting reading:', error);
      throw error;
    }
  },

  // Sync local data to Supabase (for migration)
  async syncLocalToSupabase(): Promise<void> {
    if (!this.isEnabled()) {
      console.log('Supabase not configured, skipping sync');
      return;
    }

    try {
      console.log('Starting sync from local to Supabase...');

      // Sync tracks
      const localTracks = await StorageService.getTracks();
      for (const track of localTracks) {
        await this.saveTrack(track);
      }
      console.log(`Synced ${localTracks.length} tracks`);

      // Sync readings
      const localReadings = await StorageService.getReadings();
      for (const reading of localReadings) {
        await this.saveReading(reading);
      }
      console.log(`Synced ${localReadings.length} readings`);

      console.log('Sync completed successfully!');
    } catch (error) {
      console.error('Error syncing local data to Supabase:', error);
      throw error;
    }
  },
};
