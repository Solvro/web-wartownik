import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export interface AirspaceZoneProperties {
  id: string;
  type: string;
  start: string;
  end: string;
  lower: string;
  upper: string;
  remarks: string | null;
  activated: boolean;
  regionId: string | null;
  notable: boolean;
}

export type AirspaceZones = FeatureCollection<
  Polygon | MultiPolygon,
  AirspaceZoneProperties
>;
