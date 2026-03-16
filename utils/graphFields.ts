import { TrackReading } from '@/types/TrackData';

export type GraphFieldId =
  | 'trackTemp'
  | 'uvIndex'
  | 'kegSL'
  | 'kegOut'
  | 'keg60'
  | 'keg100'
  | 'grippoSL'
  | 'grippoOut'
  | 'shine'
  | 'timestamp';

export type GraphLaneFilter = 'left' | 'right' | 'both';

export interface GraphFieldOption {
  id: GraphFieldId;
  label: string;
}

export interface GraphPoint {
  id: string;
  readingId: string;
  trackId: string;
  lane: 'left' | 'right';
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
  xValueLabel: string;
  yValueLabel: string;
  date: string;
  time: string;
  session?: string;
  pair?: string;
  reading: TrackReading;
}

export const graphFieldOptions: GraphFieldOption[] = [
  { id: 'trackTemp', label: 'Track Temp' },
  { id: 'uvIndex', label: 'UV Index (Manual)' },
  { id: 'kegSL', label: 'Keg @ Hit' },
  { id: 'kegOut', label: "Keg @ 20'" },
  { id: 'keg60', label: "Keg @ 60'" },
  { id: 'keg100', label: "Keg @ 100'" },
  { id: 'grippoSL', label: 'Grippo @ Hit' },
  { id: 'grippoOut', label: "Grippo @ 20'" },
  { id: 'shine', label: 'Shine' },
  { id: 'timestamp', label: 'Timestamp' },
];

export const getGraphFieldLabel = (fieldId: GraphFieldId) =>
  graphFieldOptions.find((field) => field.id === fieldId)?.label ?? fieldId;
