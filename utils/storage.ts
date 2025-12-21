
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, TrackReading } from '@/types/TrackData';

const TRACKS_KEY = '@tracks';
const READINGS_KEY = '@readings';

export const StorageService = {
  // Track operations
  async getTracks(): Promise<Track[]> {
    try {
      const tracksJson = await AsyncStorage.getItem(TRACKS_KEY);
      return tracksJson ? JSON.parse(tracksJson) : [];
    } catch (error) {
      console.error('Error getting tracks:', error);
      return [];
    }
  },

  async saveTrack(track: Track): Promise<void> {
    try {
      const tracks = await this.getTracks();
      const existingIndex = tracks.findIndex(t => t.id === track.id);
      
      if (existingIndex >= 0) {
        tracks[existingIndex] = track;
      } else {
        tracks.push(track);
      }
      
      await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
      console.log('Track saved successfully:', track.name);
    } catch (error) {
      console.error('Error saving track:', error);
      throw error;
    }
  },

  async deleteTrack(trackId: string): Promise<void> {
    try {
      const tracks = await this.getTracks();
      const filteredTracks = tracks.filter(t => t.id !== trackId);
      await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(filteredTracks));
      
      // Also delete all readings for this track
      const readings = await this.getReadings();
      const filteredReadings = readings.filter(r => r.trackId !== trackId);
      await AsyncStorage.setItem(READINGS_KEY, JSON.stringify(filteredReadings));
      
      console.log('Track deleted successfully:', trackId);
    } catch (error) {
      console.error('Error deleting track:', error);
      throw error;
    }
  },

  // Reading operations
  async getReadings(): Promise<TrackReading[]> {
    try {
      const readingsJson = await AsyncStorage.getItem(READINGS_KEY);
      return readingsJson ? JSON.parse(readingsJson) : [];
    } catch (error) {
      console.error('Error getting readings:', error);
      return [];
    }
  },

  async getReadingsByTrack(trackId: string): Promise<TrackReading[]> {
    try {
      const readings = await this.getReadings();
      return readings.filter(r => r.trackId === trackId);
    } catch (error) {
      console.error('Error getting readings by track:', error);
      return [];
    }
  },

  async saveReading(reading: TrackReading): Promise<void> {
    try {
      const readings = await this.getReadings();
      const existingIndex = readings.findIndex(r => r.id === reading.id);
      
      if (existingIndex >= 0) {
        readings[existingIndex] = reading;
      } else {
        readings.push(reading);
      }
      
      await AsyncStorage.setItem(READINGS_KEY, JSON.stringify(readings));
      console.log('Reading saved successfully:', reading.id);
    } catch (error) {
      console.error('Error saving reading:', error);
      throw error;
    }
  },

  async deleteReading(readingId: string): Promise<void> {
    try {
      const readings = await this.getReadings();
      const filteredReadings = readings.filter(r => r.id !== readingId);
      await AsyncStorage.setItem(READINGS_KEY, JSON.stringify(filteredReadings));
      console.log('Reading deleted successfully:', readingId);
    } catch (error) {
      console.error('Error deleting reading:', error);
      throw error;
    }
  },
};
