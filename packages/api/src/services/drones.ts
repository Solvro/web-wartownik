import { PREDICTION_LIMITS } from "@wartownik/shared/config/threats";
import { destinationPoint } from "@wartownik/shared/geo/geo";
import type {
  Layer,
  LayerFetchFunction,
  LayerLocation,
  ThreatConfidence,
  ThreatType,
} from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";

import { fetchQuery } from "../helpers/fetch-query";

export const NEPTUN_API_URL = "https://neptun.in.ua/api/v1/threats";

export interface ThreatTrailPoint {
  lat: number;
  lon: number;
  t: string;
}

export interface Threat {
  id: string;
  type: ThreatType;
  title: string;
  region: string;
  district?: string;
  locality?: string;
  lat: number;
  lon: number;
  heading: number | null;
  confidenceLevel: ThreatConfidence;
  sourceCount: number;
  count?: number;
  updatedAt: string;
  status: "active" | "stale" | "resolved";
  velocity?: { bearingDeg: number; speedKmh: number };
  confirmedAt?: string;
  uncertaintyKm?: number;
  advisory?: boolean;
  areaOnly?: boolean;
  explanationShort?: string;
  trail?: ThreatTrailPoint[] | null;
}

export async function fetchThreats(init?: RequestInit): Promise<Threat[]> {
  const { threats } = await fetchQuery<{
    serverTime: string;
    threats: Threat[];
  }>(NEPTUN_API_URL, {
    ...init,
    headers: { "User-Agent": "defensownik.solvro.pl" },
  });
  return threats;
}

function predictPosition(threat: Threat, now: number): Coordinates {
  const base = { lat: threat.lat, lng: threat.lon };
  if (
    threat.status !== "active" ||
    threat.velocity === undefined ||
    threat.confirmedAt === undefined
  ) {
    return base;
  }
  const minutes = (now - new Date(threat.confirmedAt).getTime()) / 60000;
  if (Number.isNaN(minutes) || minutes <= 0) {
    return base;
  }
  const limits = PREDICTION_LIMITS[threat.type] ?? PREDICTION_LIMITS.unknown;
  const distanceKm = Math.min(
    limits.maxKm,
    (threat.velocity.speedKmh * Math.min(minutes, limits.maxMinutes)) / 60,
  );
  return destinationPoint(base, threat.velocity.bearingDeg, distanceKm);
}

function predictPath(
  threat: Threat,
  position: Coordinates,
): Coordinates | null {
  if (threat.status !== "active" || threat.velocity === undefined) {
    return null;
  }
  const limits = PREDICTION_LIMITS[threat.type] ?? PREDICTION_LIMITS.unknown;
  const distanceKm = Math.min(
    limits.maxKm,
    (threat.velocity.speedKmh * limits.maxMinutes) / 60,
  );
  return distanceKm > 0
    ? destinationPoint(position, threat.velocity.bearingDeg, distanceKm)
    : null;
}

export function toDronePoints(
  threats: Threat[],
  now: number,
): LayerLocation<Layer.Drones>[] {
  return threats
    .filter(
      (threat) => threat.status !== "resolved" && threat.areaOnly !== true,
    )
    .map((threat): LayerLocation<Layer.Drones> => {
      const locality =
        threat.locality && threat.locality !== threat.region
          ? threat.locality
          : null;
      const position = predictPosition(threat, now);
      return {
        ...position,
        meta: {
          id: threat.id,
          type: threat.type in PREDICTION_LIMITS ? threat.type : "unknown",
          region: threat.region,
          locality,
          heading: threat.velocity?.bearingDeg ?? threat.heading,
          speedKmh: threat.velocity?.speedKmh ?? null,
          confidence: threat.confidenceLevel,
          sourceCount: threat.sourceCount,
          groupSize:
            threat.count !== undefined && threat.count >= 2
              ? threat.count
              : null,
          advisory: threat.advisory === true,
          stale: threat.status === "stale",
          updatedAt: threat.updatedAt,
          uncertaintyKm:
            threat.uncertaintyKm !== undefined && threat.uncertaintyKm > 0
              ? threat.uncertaintyKm
              : null,
          predictedPath: predictPath(threat, position),
          confirmedAt: threat.confirmedAt ?? null,
        },
      };
    });
}

export const getDrones: LayerFetchFunction<Layer.Drones> = async () => {
  const threats = await fetchThreats({ next: { revalidate: 10 } });
  return { points: toDronePoints(threats, Date.now()), clusters: [] };
};
