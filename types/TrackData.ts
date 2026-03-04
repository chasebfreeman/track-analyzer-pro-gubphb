// types/TrackData.ts

export interface LaneReading {
  trackTemp: string;
  uvIndex: string; // manual lane UV
  kegSL: string;
  kegOut: string;
  grippoSL: string;
  grippoOut: string;
  shine: string;
  notes: string;
  imageUri?: string;
}

export interface TrackReading {
  id: string;
  trackId: string;

  // legacy
  date: string;
  time: string;

  // single source of truth
  timestamp: number;
  year: number;

  session?: string;
  pair?: string;
  classCurrentlyRunning?: string;

  leftLane: LaneReading;
  rightLane: LaneReading;

  // ✅ photo paths stored in DB (private storage object paths)
  left_photo_path?: string | null;
  right_photo_path?: string | null;

  // ✅ track-local forever
  timeZone?: string;
  trackDate?: string;

  // ✅ Weather snapshot (applies to whole reading)
  weather_ts?: string;
  temp_f?: number;
  humidity_pct?: number;
  baro_inhg?: number;
  adr?: number;
  correction?: number;

  // ✅ Davis UV (from weather station)
  davis_uv_index?: number;
}

export interface Track {
  id: string;
  name: string;
  location: string;
  createdAt: number;
}

export interface DayReadings {
  date: string; // grouping key YYYY-MM-DD
  readings: TrackReading[];
}