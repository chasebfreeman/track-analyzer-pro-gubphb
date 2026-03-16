import { TrackReading } from '@/types/TrackData';
import { GraphFieldId, GraphLaneFilter, GraphPoint, getGraphFieldLabel } from '@/utils/graphFields';

const formatTrackTime = (reading: TrackReading) => {
  if (reading.timeZone && reading.timestamp) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: reading.timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(reading.timestamp));
    } catch {
      return reading.time;
    }
  }

  return reading.time;
};

const getLaneValue = (reading: TrackReading, lane: 'left' | 'right', fieldId: GraphFieldId): number | null => {
  const laneData = lane === 'left' ? reading.leftLane : reading.rightLane;

  if (fieldId === 'timestamp') {
    return typeof reading.timestamp === 'number' ? reading.timestamp : null;
  }

  const rawValue = laneData?.[fieldId as keyof typeof laneData];
  if (rawValue === undefined || rawValue === null || rawValue === '') return null;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPointValue = (fieldId: GraphFieldId, value: number) => {
  if (fieldId === 'timestamp') {
    return new Date(value).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

export function buildGraphPoints({
  readings,
  laneFilter,
  xField,
  yField,
}: {
  readings: TrackReading[];
  laneFilter: GraphLaneFilter;
  xField: GraphFieldId;
  yField: GraphFieldId;
}): GraphPoint[] {
  const lanes = laneFilter === 'both' ? (['left', 'right'] as const) : ([laneFilter] as const);
  const xLabel = getGraphFieldLabel(xField);
  const yLabel = getGraphFieldLabel(yField);

  return readings.flatMap((reading) =>
    lanes.flatMap((lane) => {
      const x = getLaneValue(reading, lane, xField);
      const y = getLaneValue(reading, lane, yField);

      if (x === null || y === null) return [];

      return [
        {
          id: `${reading.id}-${lane}-${xField}-${yField}`,
          readingId: reading.id,
          trackId: reading.trackId,
          lane,
          x,
          y,
          xLabel,
          yLabel,
          xValueLabel: formatPointValue(xField, x),
          yValueLabel: formatPointValue(yField, y),
          date: reading.trackDate || reading.date,
          time: formatTrackTime(reading),
          session: reading.session,
          pair: reading.pair,
          reading,
        },
      ];
    })
  );
}
