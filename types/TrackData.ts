// types/TrackData.ts

export interface LaneReading {
  trackTemp: string;
  uvIndex: string;
  kegSL: string;
  kegOut: string;
  keg60: string;
  keg100: string;
  grippoSL: string;
  grippoOut: string;
  shine: string;
  notes: string;
  imageUri?: string;
}

export interface TrackReading {
  id: string;
  trackId: string;
  date: string;
  time: string;
  timestamp: number;
  year: number;
  session?: string;
  pair?: string;
  classCurrentlyRunning?: string;
  leftLane: LaneReading;
  rightLane: LaneReading;
  left_photo_path?: string | null;
  right_photo_path?: string | null;
  timeZone?: string;
  trackDate?: string;
  weather_ts?: string;
  temp_f?: number;
  humidity_pct?: number;
  baro_inhg?: number;
  adr?: number;
  correction?: number;
  davis_uv_index?: number;
}

export interface TrackPhoto {
  id: string;
  trackId: string;
  photoPath: string;
  timestamp: number;
  trackDate: string;
  timeLabel: string;
  timeZone?: string;
  createdAt: number;
}

export interface Track {
  id: string;
  name: string;
  location: string;
  createdAt: number;
}

export interface DayReadings {
  date: string;
  readings: TrackReading[];
}
