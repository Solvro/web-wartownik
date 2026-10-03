import { fetchQuery } from "@/lib/helpers/fetch-query";
import { destinationPoint } from "@/lib/helpers/geo";
import type {
  Layer,
  LayerFetchFunction,
  LayerLocation,
  ThreatConfidence,
  ThreatType,
} from "@/types/layers";
import type { Coordinates } from "@/types/map";

export const NEPTUN_API_URL = "https://neptun.in.ua/api/v1/threats";

interface Threat {
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
}

const PREDICTION_LIMITS: Record<
  ThreatType,
  { maxMinutes: number; maxKm: number }
> = {
  uav: { maxMinutes: 12, maxKm: 18 },
  recon: { maxMinutes: 12, maxKm: 12 },
  fpv: { maxMinutes: 10, maxKm: 10 },
  missile: { maxMinutes: 5, maxKm: 30 },
  kab: { maxMinutes: 4, maxKm: 10 },
  ballistic: { maxMinutes: 1.5, maxKm: 20 },
  mig31k: { maxMinutes: 6, maxKm: 24 },
  unknown: { maxMinutes: 6, maxKm: 10 },
};

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

export const getDrones: LayerFetchFunction<Layer.Drones> = async () => {
  const { threats } = await fetchQuery<{
    serverTime: string;
    threats: Threat[];
  }>(NEPTUN_API_URL, {
    headers: { "User-Agent": "defensownik.solvro.pl" },
    next: { revalidate: 10 },
  });
  const now = Date.now();

  const points = threats
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
        },
      };
    });

  return { points, clusters: [] };
};
