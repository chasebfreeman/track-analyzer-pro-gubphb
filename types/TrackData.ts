export interface LaneReading {
  trackTemp: string;
  uvIndex: string;
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

  // ✅ NEW (track-local forever)
  timeZone?: string;
  trackDate?: string;
}



export interface Track {
  id: string;
  name: string;
  location: string;
  createdAt: number;
}

export interface DayReadings {
  date: string; // this is your grouping key (use trackDate style YYYY-MM-DD)
  readings: TrackReading[];
}
