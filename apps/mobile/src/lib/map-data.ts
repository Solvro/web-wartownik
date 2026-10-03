import { LAYER_VISUALS } from "@wartownik/shared/config/layer-visuals";
import { LAYER_CONFIG } from "@wartownik/shared/config/layers";
import { presentPoint } from "@wartownik/shared/presentation/index";
import type { RegionState } from "@wartownik/shared/regions";
import { Layer } from "@wartownik/shared/types/layers";
import type {
  LayerClusterWithLayer,
  LayerPoint,
} from "@wartownik/shared/types/layers";
import type { FeatureCollection, Point } from "geojson";

import { REGIONS } from "./regions";

const LIVE = new Set([Layer.Drones, Layer.Aircraft]);

export interface PointFeatureProps {
  i: number;
  color: string;
  layer: string;
  pulse: boolean;
  dimmed: boolean;
  w: number;
  server?: boolean;
  total?: number;
}

type Points = FeatureCollection<Point, PointFeatureProps>;

const empty = (): Points => ({ type: "FeatureCollection", features: [] });

export function buildPointCollections(
  points: LayerPoint[],
  clusters: LayerClusterWithLayer[],
) {
  const clustered = empty();
  const live = empty();
  points.forEach((point, index) => {
    const presentation = presentPoint(point);
    const feature = {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] },
      properties: {
        i: index,
        color: presentation.color,
        layer: LAYER_CONFIG[point.layer].slug,
        pulse: presentation.pulse === true,
        dimmed: presentation.dimmed === true,
        w: 1,
      },
    };
    (LIVE.has(point.layer) ? live : clustered).features.push(feature);
  });
  for (const cluster of clusters) {
    clustered.features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [cluster.lng, cluster.lat] },
      properties: {
        i: -1,
        color: LAYER_VISUALS[cluster.layer].color,
        layer: LAYER_CONFIG[cluster.layer].slug,
        pulse: false,
        dimmed: false,
        w: cluster.count,
        server: true,
        total: cluster.count,
      },
    });
  }
  return { clustered, live };
}

export function regionsWithStatus(states: RegionState[]) {
  const statusById = new Map(states.map((state) => [state.id, state.status]));
  return {
    ...REGIONS,
    features: REGIONS.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        status: statusById.get(feature.properties.id) ?? "none",
      },
    })),
  };
}

export const COUNTRY_COLORS: Record<string, string> = {
  PL: "#60A5FA",
  UA: "#2DD4BF",
  BY: "#C084FC",
  RU: "#A8A29E",
};
