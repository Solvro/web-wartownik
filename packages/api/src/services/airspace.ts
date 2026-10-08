import { NOTABLE_AIRSPACE_TYPES } from "@wartownik/shared/airspace";
import regionsGeometry from "@wartownik/shared/geo/regions.json";
import { regionAt } from "@wartownik/shared/regions";
import type { RegionCollection } from "@wartownik/shared/regions";
import type { AirspaceZones } from "@wartownik/shared/types/airspace";
import type { MultiPolygon, Polygon } from "geojson";

import { fetchQuery } from "../helpers/fetch-query";

const PANSA_URLS = [
  "https://airspace.pansa.pl/map-configuration/uup",
  "https://airspace.pansa.pl/map-configuration/aup",
];

interface PansaReservation {
  startDate: string;
  endDate: string;
  lowerAltitude: string;
  upperAltitude: string;
  remarks: string | null;
  reservationStatus: string;
}

interface PansaFeature {
  geometry: Polygon | MultiPolygon | null;
  properties: {
    airspaceElementType: string;
    designator: string;
    centroid?: { x: number; y: number }[];
    airspaceReservations?: PansaReservation[] | null;
  };
}

const regions = regionsGeometry as unknown as RegionCollection;

async function fetchPansa(): Promise<PansaFeature[]> {
  let lastError: unknown = new Error("PAŻP returned no zones");
  for (const url of PANSA_URLS) {
    try {
      const features = await fetchQuery<PansaFeature[]>(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; wartownik)" },
        next: { revalidate: 300 },
      });
      if (Array.isArray(features) && features.length > 0) {
        return features;
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function getAirspaceZones(): Promise<AirspaceZones> {
  const now = Date.now();
  const features = await fetchPansa();
  return {
    type: "FeatureCollection",
    features: features.flatMap((feature) => {
      const { properties, geometry } = feature;
      const reservation = properties.airspaceReservations?.find(
        (item) =>
          Date.parse(item.startDate) <= now && now <= Date.parse(item.endDate),
      );
      if (geometry == null || reservation === undefined) {
        return [];
      }
      const centroid = properties.centroid?.[0];
      const region =
        centroid === undefined
          ? null
          : regionAt(regions, { lat: centroid.y, lng: centroid.x });
      const type = properties.airspaceElementType;
      return [
        {
          type: "Feature" as const,
          geometry,
          properties: {
            id: properties.designator,
            type,
            start: reservation.startDate,
            end: reservation.endDate,
            lower: reservation.lowerAltitude,
            upper: reservation.upperAltitude,
            remarks: reservation.remarks?.trim() || null,
            activated: reservation.reservationStatus === "ACTIVATED",
            regionId: region?.country === "PL" ? region.id : null,
            notable: NOTABLE_AIRSPACE_TYPES.has(type),
          },
        },
      ];
    }),
  };
}
