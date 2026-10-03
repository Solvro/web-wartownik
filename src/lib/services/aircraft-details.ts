import { env } from "@/env";
import { fetchQuery } from "@/lib/helpers/fetch-query";
import type {
  AircraftDetails,
  AircraftPhoto,
  AircraftTrackPoint,
} from "@/types/aircraft";

const PLANESPOTTERS_URL = "https://api.planespotters.net/pub/photos/hex";
const TRACE_URL = "https://globe.adsb.lol/data/traces";
const MAX_TRACK_AGE_S = 6 * 60 * 60;
const MAX_TRACK_POINTS = 400;
const NEW_LEG_FLAG = 2;

interface PlanespottersResponse {
  photos: {
    thumbnail_large: { src: string; size: { width: number; height: number } };
    link: string;
    photographer: string;
  }[];
}

type TraceEntry = [
  number,
  number,
  number,
  number | "ground" | null,
  number | null,
  number | null,
  number,
  ...unknown[],
];

interface TraceResponse {
  desc?: string;
  timestamp: number;
  trace: TraceEntry[];
}

async function fetchPhoto(hex: string): Promise<AircraftPhoto | null> {
  const { photos } = await fetchQuery<PlanespottersResponse>(
    `${PLANESPOTTERS_URL}/${hex}`,
    {
      headers: {
        "User-Agent": `Defensownik/1.0 (+${env.NEXT_PUBLIC_SITE_URL})`,
      },
      next: { revalidate: 86400 },
    },
  );
  const photo = photos[0];
  return photo === undefined
    ? null
    : {
        src: photo.thumbnail_large.src,
        width: photo.thumbnail_large.size.width,
        height: photo.thumbnail_large.size.height,
        link: photo.link,
        photographer: photo.photographer,
      };
}

function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) {
    return items;
  }
  const step = (items.length - 1) / (max - 1);
  return Array.from(
    { length: max },
    (_, index) => items[Math.round(index * step)],
  );
}

async function fetchTrace(
  hex: string,
): Promise<{ description: string | null; track: AircraftTrackPoint[] }> {
  const { desc, timestamp, trace } = await fetchQuery<TraceResponse>(
    `${TRACE_URL}/${hex.slice(-2)}/trace_full_${hex}.json`,
    {
      headers: { "User-Agent": "defensownik.solvro.pl" },
      next: { revalidate: 30 },
    },
  );

  let legStart = 0;
  trace.forEach((entry, index) => {
    if ((entry[6] & NEW_LEG_FLAG) !== 0) {
      legStart = index;
    }
  });
  const newest = timestamp + (trace.at(-1)?.[0] ?? 0);

  const track = trace
    .slice(legStart)
    .filter((entry) => newest - (timestamp + entry[0]) <= MAX_TRACK_AGE_S)
    .map(([offset, lat, lng, altitude]) => ({
      lat,
      lng,
      altitudeFt: typeof altitude === "number" ? altitude : null,
      timestamp: Math.round((timestamp + offset) * 1000),
    }));

  return {
    description: desc ?? null,
    track: downsample(track, MAX_TRACK_POINTS),
  };
}

export async function getAircraftDetails(
  hex: string,
): Promise<AircraftDetails> {
  const [photo, trace] = await Promise.allSettled([
    fetchPhoto(hex),
    fetchTrace(hex),
  ]);
  if (photo.status === "rejected") {
    console.error(`Failed to fetch aircraft photo ${hex}:`, photo.reason);
  }
  if (trace.status === "rejected") {
    console.error(`Failed to fetch aircraft trace ${hex}:`, trace.reason);
  }
  return {
    photo: photo.status === "fulfilled" ? photo.value : null,
    description: trace.status === "fulfilled" ? trace.value.description : null,
    track: trace.status === "fulfilled" ? trace.value.track : [],
  };
}
