
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
  date: string;
  time: string;
  timestamp: number;
  classCurrentlyRunning?: string;
  leftLane: LaneReading;
  rightLane: LaneReading;
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
