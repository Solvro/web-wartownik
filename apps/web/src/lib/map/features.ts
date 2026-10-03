import { LAYER_CONFIG } from "@wartownik/shared/config/layers";
import { destinationPoint } from "@wartownik/shared/geo/geo";
import { planeHeadingIcon } from "@wartownik/shared/heading-icon";
import { presentPoint } from "@wartownik/shared/presentation/index";
import { Layer } from "@wartownik/shared/types/layers";
import type {
  LayerClusterWithLayer,
  LayerPoint,
} from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Polygon,
} from "geojson";

import { arrowImageId, markerImageId } from "./images";

export const CLUSTERED_LAYERS = [
  Layer.Shelters,
  Layer.AEDs,
  Layer.Smog,
  Layer.Floods,
  Layer.Reports,
];

export interface PointProperties {
  i: number;
  k: string;
  layer: string;
  w: number;
  img: string;
  arrow?: string;
  heading?: number;
  rotate?: number;
  color: string;
  pulse: boolean;
  dimmed: boolean;
}

export type ServerClusterProperties = {
  kind: "server";
  layer: string;
  w: number;
  total: number;
} & Record<string, string | number>;

type PointCollection<P> = FeatureCollection<Point, P>;

export interface ZoneProperties {
  i: number;
  color: string;
  dimmed: boolean;
}

export interface MapFeatures {
  clustered: PointCollection<PointProperties | ServerClusterProperties>;
  live: PointCollection<PointProperties>;
  fires: PointCollection<PointProperties & { intensity: number }>;
  halos: PointCollection<{ color: string }>;
  zones: FeatureCollection<Polygon | LineString, ZoneProperties>;
}

const CIRCLE_SEGMENTS = 64;

function circle(center: Coordinates, radiusKm: number): Polygon {
  const ring = Array.from({ length: CIRCLE_SEGMENTS + 1 }, (_, index) => {
    const { lat, lng } = destinationPoint(
      center,
      (index / CIRCLE_SEGMENTS) * 360,
      radiusKm,
    );
    return [lng, lat];
  });
  return { type: "Polygon", coordinates: [ring] };
}

const toPoint = ({ lat, lng }: Coordinates): Point => ({
  type: "Point",
  coordinates: [lng, lat],
});

function rawKey(point: LayerPoint): string {
  const meta = point.meta as { id?: unknown };
  if (meta.id !== undefined && meta.id !== null) {
    return `${point.layer}:${String(meta.id)}`;
  }
  return `${point.layer}:${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

export function pointKeys(points: LayerPoint[]): string[] {
  const seen = new Map<string, number>();
  return points.map((point) => {
    const key = rawKey(point);
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? key : `${key}#${count}`;
  });
}

const emptyCollection = <
  G extends Point | Polygon | LineString,
  P,
>(): FeatureCollection<G, P> => ({
  type: "FeatureCollection",
  features: [],
});

export function buildMapFeatures(
  points: LayerPoint[],
  keys: string[],
  clusters: LayerClusterWithLayer[],
): MapFeatures {
  const result: MapFeatures = {
    clustered: emptyCollection(),
    live: emptyCollection(),
    fires: emptyCollection(),
    halos: emptyCollection(),
    zones: emptyCollection(),
  };

  points.forEach((point, index) => {
    const presentation = presentPoint(point);
    const heading =
      presentation.heading === null || presentation.heading === undefined
        ? undefined
        : presentation.heading;
    const planeIcon =
      point.layer === Layer.Aircraft && heading !== undefined
        ? planeHeadingIcon(heading)
        : undefined;
    const properties: PointProperties = {
      i: index,
      k: keys[index],
      layer: LAYER_CONFIG[point.layer].slug,
      w: 1,
      img: markerImageId(
        planeIcon?.variant ?? presentation.icon,
        presentation.color,
      ),
      arrow:
        heading === undefined || planeIcon !== undefined
          ? undefined
          : arrowImageId(presentation.color),
      heading: planeIcon === undefined ? heading : undefined,
      rotate: planeIcon?.rotation,
      color: presentation.color,
      pulse: presentation.pulse === true,
      dimmed: presentation.dimmed === true,
    };
    const geometry = toPoint(point);

    if (point.layer === Layer.Fires) {
      result.fires.features.push({
        type: "Feature",
        geometry,
        properties: { ...properties, intensity: point.meta.intensity },
      });
      return;
    }

    if (point.layer === Layer.Drones || point.layer === Layer.Aircraft) {
      result.live.features.push({ type: "Feature", geometry, properties });
      const meta = point.meta;
      if (point.layer === Layer.Drones && point.meta.uncertaintyKm !== null) {
        result.zones.features.push({
          type: "Feature",
          geometry: circle(point, point.meta.uncertaintyKm),
          properties: {
            i: index,
            color: presentation.color,
            dimmed: properties.dimmed,
          },
        });
      }
      if (meta.predictedPath !== null) {
        result.zones.features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [point.lng, point.lat],
              [meta.predictedPath.lng, meta.predictedPath.lat],
            ],
          },
          properties: {
            i: index,
            color: presentation.color,
            dimmed: properties.dimmed,
          },
        });
      }
      return;
    }

    if (point.layer === Layer.Smog) {
      result.halos.features.push({
        type: "Feature",
        geometry,
        properties: { color: presentation.color },
      });
    }
    result.clustered.features.push({ type: "Feature", geometry, properties });
  });

  for (const cluster of clusters) {
    const slug = LAYER_CONFIG[cluster.layer].slug;
    const feature: Feature<Point, ServerClusterProperties> = {
      type: "Feature",
      geometry: toPoint(cluster),
      properties: {
        kind: "server",
        layer: slug,
        w: cluster.count,
        total: cluster.count,
        [`s_${slug}`]: cluster.count,
      },
    };
    result.clustered.features.push(feature);
  }

  return result;
}
