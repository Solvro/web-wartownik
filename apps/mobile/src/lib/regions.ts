import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import regionsGeometry from "@wartownik/shared/geo/regions.json";
import type {
  RegionCollection,
  RegionFeature,
} from "@wartownik/shared/regions";
import type { Coordinates } from "@wartownik/shared/types/map";

export const REGIONS = regionsGeometry as unknown as RegionCollection;

export const POLISH_REGIONS: RegionFeature[] = REGIONS.features
  .filter((feature) => feature.properties.country === "PL")
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name, "pl"));

export function regionAt({ lat, lng }: Coordinates): RegionFeature | undefined {
  const position = point([lng, lat]);
  return POLISH_REGIONS.find((region) =>
    booleanPointInPolygon(position, region),
  );
}

export function regionName(regionId: string): string {
  return (
    REGIONS.features.find((feature) => feature.properties.id === regionId)
      ?.properties.name ?? regionId
  );
}
