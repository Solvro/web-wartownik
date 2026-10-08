import booleanIntersects from "@turf/boolean-intersects";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { lineString, point } from "@turf/helpers";
import pointToPolygonDistance from "@turf/point-to-polygon-distance";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";

import { REGION_WATCH_DISTANCE_KM } from "./config/constants";
import { COURSE_LIMITS } from "./config/threats";
import { destinationPoint, haversineDistance } from "./geo/geo";
import type { Layer, LayerLocation } from "./types/layers";
import type { Bounds, Coordinates } from "./types/map";
import type { RcbAlert } from "./types/rcb-alerts";

export type RegionStatus = "threat" | "approaching" | "watch" | "none";

export type RegionCountry = "PL" | "UA" | "BY" | "RU";
export type RegionKind =
  "voivodeship" | "oblast" | "city" | "republic" | "krai";

export interface RegionProperties {
  id: string;
  name: string;
  label: string;
  country: RegionCountry;
  kind: RegionKind;
}

export const REGION_KIND_LABELS: Record<RegionKind, string> = {
  voivodeship: "Województwo",
  oblast: "Obwód",
  city: "Miasto wydzielone",
  republic: "Republika",
  krai: "Kraj",
};

export const REGION_COUNTRY_LABELS: Record<RegionCountry, string> = {
  PL: "Polska",
  UA: "Ukraina",
  BY: "Białoruś",
  RU: "Rosja",
};

export type RegionFeature = Feature<Polygon | MultiPolygon, RegionProperties>;
export type RegionCollection = FeatureCollection<
  Polygon | MultiPolygon,
  RegionProperties
>;

export interface RegionThreat {
  threatId: string;
  status: Exclude<RegionStatus, "none">;
  distanceKm: number;
  etaMinutes: number | null;
}

export interface RegionState {
  id: string;
  name: string;
  label: string;
  country: RegionCountry;
  kind: RegionKind;
  status: RegionStatus;
  threats: RegionThreat[];
  etaMinutes: number | null;
  rcb?: RcbAlert;
}

export const REGION_STATUS_RANK: Record<RegionStatus, number> = {
  none: 0,
  watch: 1,
  approaching: 2,
  threat: 3,
};

export const REGION_STATUS_VISUALS: Record<
  RegionStatus,
  { color: string; label: string }
> = {
  threat: { color: "#dc2626", label: "Zagrożenie w regionie" },
  approaching: { color: "#dc2626", label: "Zagrożenie kursem na region" },
  watch: { color: "#ca8a04", label: "Zagrożenie w pobliżu" },
  none: { color: "#3b82f6", label: "Brak zagrożeń" },
};

export const regionGenitive = (name: string) => `${name}go`;

const KM_PER_DEGREE = 111;

function bboxDistanceKm(bounds: Bounds, { lat, lng }: Coordinates): number {
  const dLat = Math.max(bounds.se.lat - lat, 0, lat - bounds.nw.lat);
  const dLng = Math.max(bounds.nw.lng - lng, 0, lng - bounds.se.lng);
  return Math.hypot(
    dLat * KM_PER_DEGREE,
    dLng * KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180),
  );
}

const etaMinutes = (distanceKm: number, speedKmh: number | null) =>
  speedKmh !== null && speedKmh > 0
    ? Math.max(1, Math.round((distanceKm / speedKmh) * 60))
    : null;

function crossesRegion(
  from: Coordinates,
  to: Coordinates,
  region: RegionFeature,
): boolean {
  return booleanIntersects(
    lineString([
      [from.lng, from.lat],
      [to.lng, to.lat],
    ]),
    region,
  );
}

function classify(
  region: RegionFeature,
  bounds: Bounds,
  threat: LayerLocation<Layer.Drones>,
  includeWatch: boolean,
): RegionThreat | null {
  const course = COURSE_LIMITS[threat.meta.type] ?? COURSE_LIMITS.unknown;
  const reach = Math.max(
    REGION_WATCH_DISTANCE_KM,
    threat.meta.uncertaintyKm ?? 0,
    threat.meta.predictedPath === null
      ? 0
      : haversineDistance(threat, threat.meta.predictedPath),
    includeWatch && threat.meta.heading !== null ? course.watchKm : 0,
  );
  if (bboxDistanceKm(bounds, threat) > reach) {
    return null;
  }

  const position = point([threat.lng, threat.lat]);
  const active = !threat.meta.stale && !threat.meta.advisory;

  if (booleanPointInPolygon(position, region)) {
    return {
      threatId: threat.meta.id,
      status: active || !includeWatch ? "threat" : "watch",
      distanceKm: 0,
      etaMinutes: null,
    };
  }

  const distanceKm = pointToPolygonDistance(position, region, {
    units: "kilometers",
  });
  const path = threat.meta.predictedPath;
  if (active && path !== null && crossesRegion(threat, path, region)) {
    return {
      threatId: threat.meta.id,
      status: "approaching",
      distanceKm,
      etaMinutes: etaMinutes(distanceKm, threat.meta.speedKmh),
    };
  }

  const heading = threat.meta.heading;
  if (
    active &&
    includeWatch &&
    heading !== null &&
    distanceKm <= course.watchKm &&
    crossesRegion(
      threat,
      destinationPoint(threat, heading, course.watchKm),
      region,
    )
  ) {
    return {
      threatId: threat.meta.id,
      status: distanceKm <= course.alertKm ? "approaching" : "watch",
      distanceKm,
      etaMinutes: etaMinutes(
        distanceKm,
        threat.meta.speedKmh ?? course.cruiseKmh,
      ),
    };
  }

  const uncertainty = threat.meta.uncertaintyKm ?? 0;
  if (!includeWatch) {
    return null;
  }
  if (distanceKm <= REGION_WATCH_DISTANCE_KM || uncertainty >= distanceKm) {
    return {
      threatId: threat.meta.id,
      status: "watch",
      distanceKm,
      etaMinutes: null,
    };
  }
  return null;
}

export function computeRegionStates(
  regions: RegionCollection,
  threats: LayerLocation<Layer.Drones>[],
): RegionState[] {
  return regions.features.map((region) => {
    const bounds = regionBounds(region);
    const includeWatch = region.properties.country === "PL";
    const regionThreats = threats
      .map((threat) => classify(region, bounds, threat, includeWatch))
      .filter((entry): entry is RegionThreat => entry !== null)
      .sort(
        (a, b) =>
          REGION_STATUS_RANK[b.status] - REGION_STATUS_RANK[a.status] ||
          a.distanceKm - b.distanceKm,
      );
    const top = regionThreats[0];
    const etas = regionThreats
      .map((entry) => entry.etaMinutes)
      .filter((eta): eta is number => eta !== null);
    return {
      ...region.properties,
      status: top?.status ?? "none",
      threats: regionThreats,
      etaMinutes: etas.length > 0 ? Math.min(...etas) : null,
    };
  });
}

export const isActiveRcbAirAlert = (alert: RcbAlert) =>
  alert.air && !alert.cancelled;

export function applyRcbAlerts(
  states: RegionState[],
  alerts: RcbAlert[],
): RegionState[] {
  const active = alerts.filter(isActiveRcbAirAlert);
  if (active.length === 0) {
    return states;
  }
  return states.map((state) => {
    const rcb = active.find((alert) => alert.regionIds.includes(state.id));
    if (rcb === undefined) {
      return state;
    }
    return {
      ...state,
      rcb,
      status:
        REGION_STATUS_RANK[state.status] < REGION_STATUS_RANK.watch
          ? "watch"
          : state.status,
    };
  });
}

export function regionAt(
  regions: RegionCollection,
  { lat, lng }: Coordinates,
): RegionProperties | null {
  const position = point([lng, lat]);
  return (
    regions.features.find((region) => booleanPointInPolygon(position, region))
      ?.properties ?? null
  );
}

export function regionBounds(region: RegionFeature): Bounds {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  const polygons =
    region.geometry.type === "Polygon"
      ? [region.geometry.coordinates]
      : region.geometry.coordinates;
  for (const polygon of polygons) {
    for (const [lng, lat] of polygon[0]) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return { nw: { lat: north, lng: west }, se: { lat: south, lng: east } };
}

export function regionAlertText(region: RegionState): string {
  const name = `woj. ${regionGenitive(region.name)}`;
  if (region.rcb !== undefined && region.threats.length === 0) {
    return `Alert RCB dla ${name}`;
  }
  switch (region.status) {
    case "threat":
      return `Zagrożenie powietrzne nad obszarem ${name}`;
    case "approaching":
      return `Zagrożenie zbliża się do ${name}${region.etaMinutes === null ? "" : ` – ok. ${region.etaMinutes} min`}`;
    case "watch":
      return `Zagrożenie w pobliżu ${name}`;
    case "none":
      return "";
  }
}

export function sortedAlerts(regions: RegionState[]): RegionState[] {
  return regions
    .filter((region) => region.country === "PL" && region.status !== "none")
    .sort(
      (a, b) =>
        REGION_STATUS_RANK[b.status] - REGION_STATUS_RANK[a.status] ||
        (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity),
    );
}
