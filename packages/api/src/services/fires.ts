import { POLAND_BOUNDS } from "@defensownik/shared/config/constants";
import type {
  FireConfidence,
  FireMeta,
  Layer,
  LayerFetchFunction,
  LayerLocation,
} from "@defensownik/shared/types/layers";

import { serverEnv } from "../env";
import { parseCsv } from "../helpers/csv";
import { fetchQuery } from "../helpers/fetch-query";

const FIRMS_SOURCE = "VIIRS_NOAA20_NRT";
const FIRMS_DAYS = 5;
const INTENSITY_THRESHOLDS_MW = [5, 20];

const CONFIDENCE_MAP: Record<string, FireConfidence> = {
  l: "low",
  n: "nominal",
  h: "high",
};

function firmsUrl() {
  const { west, south, east, north } = POLAND_BOUNDS;
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${serverEnv().NASA_FIRMS_MAP_KEY}/${FIRMS_SOURCE}/${west},${south},${east},${north}/${FIRMS_DAYS}`;
}

function parseDetectedAt(date: string, time: string): string | null {
  const padded = time.padStart(4, "0");
  const parsed = new Date(
    `${date}T${padded.slice(0, 2)}:${padded.slice(2, 4)}:00Z`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export const getFires: LayerFetchFunction<Layer.Fires> = async () => {
  const csv = await fetchQuery<string>(
    firmsUrl(),
    { next: { revalidate: 3600 } },
    false,
  );
  if (!csv.startsWith("latitude")) {
    throw new Error(`Unexpected FIRMS response: ${csv.slice(0, 200)}`);
  }

  const points = parseCsv(csv).flatMap((row): LayerLocation<Layer.Fires>[] => {
    const lat = Number.parseFloat(row.latitude);
    const lng = Number.parseFloat(row.longitude);
    const frp = Number.parseFloat(row.frp);
    const confidence = CONFIDENCE_MAP[row.confidence] ?? "nominal";
    const detectedAt = parseDetectedAt(row.acq_date, row.acq_time);
    if (
      confidence === "low" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      detectedAt === null
    ) {
      return [];
    }
    const safeFrp = Number.isFinite(frp) ? frp : 0;
    const intensity = (1 +
      INTENSITY_THRESHOLDS_MW.filter((threshold) => safeFrp >= threshold)
        .length) as FireMeta["intensity"];
    return [
      {
        lat,
        lng,
        meta: {
          intensity,
          frp: safeFrp,
          confidence,
          satellite: row.satellite,
          isDaytime: row.daynight === "D",
          detectedAt,
        },
      },
    ];
  });

  return { points, clusters: [] };
};
