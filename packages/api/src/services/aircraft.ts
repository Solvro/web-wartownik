import { destinationPoint, isInBounds } from "@wartownik/shared/geo/geo";
import type {
  Layer,
  LayerFetchFunction,
  LayerLocation,
} from "@wartownik/shared/types/layers";

import { fetchQuery } from "../helpers/fetch-query";

const ADSB_MIL_URL = "https://api.adsb.lol/v2/mil";
const REGION_BOUNDS = {
  nw: { lat: 58, lng: 10 },
  se: { lat: 45, lng: 35 },
};
const MAX_SEEN_SECONDS = 120;
const PREDICTION_MINUTES = 5;
const KNOTS_TO_KMH = 1.852;
const EMERGENCY_SQUAWKS = new Set(["7500", "7600", "7700"]);

interface AdsbAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  true_heading?: number;
  squawk?: string;
  emergency?: string;
  seen_pos?: number;
  seen?: number;
}

const trimmed = (value: string | undefined) => {
  const result = value?.trim();
  return result === undefined || result === "" ? null : result;
};

export const getAircraft: LayerFetchFunction<Layer.Aircraft> = async () => {
  const { ac } = await fetchQuery<{ ac: AdsbAircraft[] }>(ADSB_MIL_URL, {
    headers: { "User-Agent": "defensownik.solvro.pl" },
    next: { revalidate: 10 },
  });

  const points = ac.flatMap((aircraft): LayerLocation<Layer.Aircraft>[] => {
    const { lat, lon } = aircraft;
    const seenSeconds = aircraft.seen_pos ?? aircraft.seen ?? 0;
    if (
      lat === undefined ||
      lon === undefined ||
      seenSeconds > MAX_SEEN_SECONDS ||
      !isInBounds({ lat, lng: lon }, REGION_BOUNDS)
    ) {
      return [];
    }

    const onGround = aircraft.alt_baro === "ground";
    const heading = aircraft.track ?? aircraft.true_heading ?? null;
    const speedKt = aircraft.gs ?? null;
    const squawk = trimmed(aircraft.squawk);
    const predictedPath =
      !onGround && heading !== null && speedKt !== null && speedKt > 0
        ? destinationPoint(
            { lat, lng: lon },
            heading,
            (speedKt * KNOTS_TO_KMH * PREDICTION_MINUTES) / 60,
          )
        : null;

    return [
      {
        lat,
        lng: lon,
        meta: {
          id: aircraft.hex,
          callsign: trimmed(aircraft.flight),
          registration: trimmed(aircraft.r),
          aircraftType: trimmed(aircraft.t),
          altitudeFt:
            typeof aircraft.alt_baro === "number" ? aircraft.alt_baro : null,
          onGround,
          speedKt,
          heading,
          squawk,
          emergency:
            (squawk !== null && EMERGENCY_SQUAWKS.has(squawk)) ||
            (aircraft.emergency !== undefined && aircraft.emergency !== "none"),
          seenSeconds,
          predictedPath,
        },
      },
    ];
  });

  return { points, clusters: [] };
};
