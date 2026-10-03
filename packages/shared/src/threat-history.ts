import { haversineDistance } from "./geo/geo";
import { Layer } from "./types/layers";
import type { LayerLocation } from "./types/layers";
import type { Coordinates } from "./types/map";
import type {
  ThreatHistory,
  ThreatHistorySample,
  ThreatHistoryTrack,
} from "./types/threat-history";

export const HISTORY_LINGER_MS = 15 * 60 * 1000;
const STALE_AFTER_MS = 5 * 60 * 1000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function bearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const toCoordinates = ([lat, lng]: ThreatHistorySample): Coordinates => ({
  lat,
  lng,
});

export function isTrackVisibleAt(track: ThreatHistoryTrack, time: number) {
  const first = track.samples[0];
  const last = track.samples.at(-1);
  return (
    first !== undefined &&
    last !== undefined &&
    first[2] <= time &&
    time <= last[2] + HISTORY_LINGER_MS
  );
}

export function trackPathUntil(
  track: ThreatHistoryTrack,
  time: number,
): Coordinates[] {
  const path: Coordinates[] = [];
  for (const sample of track.samples) {
    if (sample[2] > time) {
      break;
    }
    path.push(toCoordinates(sample));
  }
  const position = trackPositionAt(track, time);
  if (position !== null) {
    path.push(position.coordinates);
  }
  return path;
}

function trackPositionAt(track: ThreatHistoryTrack, time: number) {
  const { samples } = track;
  const nextIndex = samples.findIndex((sample) => sample[2] > time);
  if (nextIndex === 0) {
    return null;
  }
  const previous =
    samples[nextIndex === -1 ? samples.length - 1 : nextIndex - 1];
  const next = nextIndex === -1 ? undefined : samples[nextIndex];
  if (next === undefined) {
    const before = samples.at(-2);
    return {
      coordinates: toCoordinates(previous),
      lastSample: previous,
      segment: before === undefined ? null : ([before, previous] as const),
    };
  }
  const progress = (time - previous[2]) / Math.max(next[2] - previous[2], 1);
  return {
    coordinates: {
      lat: previous[0] + (next[0] - previous[0]) * progress,
      lng: previous[1] + (next[1] - previous[1]) * progress,
    },
    lastSample: previous,
    segment: [previous, next] as const,
  };
}

export function threatsAt(
  history: ThreatHistory,
  time: number,
): LayerLocation<Layer.Drones>[] {
  return history.tracks.flatMap((track) => {
    if (!isTrackVisibleAt(track, time)) {
      return [];
    }
    const position = trackPositionAt(track, time);
    if (position === null) {
      return [];
    }
    const { segment, lastSample, coordinates } = position;
    const moved =
      segment === null
        ? null
        : {
            heading: bearing(
              toCoordinates(segment[0]),
              toCoordinates(segment[1]),
            ),
            speedKmh:
              haversineDistance(
                toCoordinates(segment[0]),
                toCoordinates(segment[1]),
              ) / Math.max((segment[1][2] - segment[0][2]) / 3_600_000, 1 / 60),
          };
    const lastSeen = track.samples.at(-1)?.[2] ?? lastSample[2];
    return [
      {
        ...coordinates,
        meta: {
          id: track.id,
          type: track.type,
          region: "",
          locality: null,
          heading: moved !== null && moved.speedKmh > 1 ? moved.heading : null,
          speedKmh:
            moved !== null && moved.speedKmh > 1
              ? Math.round(moved.speedKmh)
              : null,
          confidence: "medium",
          sourceCount: 1,
          groupSize: null,
          advisory: false,
          stale: time - lastSeen > STALE_AFTER_MS,
          updatedAt: new Date(lastSample[2]).toISOString(),
          uncertaintyKm: null,
          predictedPath: null,
          confirmedAt: null,
          historical: true,
        },
      },
    ];
  });
}

export function activityHistogram(
  history: ThreatHistory,
  buckets: number,
): number[] {
  const span = Math.max(history.to - history.from, 1);
  const counts = Array.from({ length: buckets }, () => 0);
  for (const track of history.tracks) {
    const first = track.samples[0]?.[2];
    const last = track.samples.at(-1)?.[2];
    if (first === undefined || last === undefined) {
      continue;
    }
    const start = Math.floor(((first - history.from) / span) * buckets);
    const end = Math.floor(
      ((last + HISTORY_LINGER_MS - history.from) / span) * buckets,
    );
    for (
      let bucket = Math.max(start, 0);
      bucket <= Math.min(end, buckets - 1);
      bucket++
    ) {
      counts[bucket] += 1;
    }
  }
  return counts;
}
