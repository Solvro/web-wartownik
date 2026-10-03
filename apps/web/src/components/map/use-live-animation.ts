"use client";

import { motionModel } from "@defensownik/shared/motion";
import type { LayerPoint } from "@defensownik/shared/types/layers";
import type { Coordinates } from "@defensownik/shared/types/map";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  Position,
} from "geojson";
import type { GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { MapFeatures } from "@/lib/map/features";

const FRAME_MS = 66;
const CORRECTION_MS = 1000;

interface Correction {
  dLat: number;
  dLng: number;
}

function shift(position: Position, dLat: number, dLng: number): Position {
  return [position[0] + dLng, position[1] + dLat];
}

function shiftGeometry(
  geometry: Geometry,
  dLat: number,
  dLng: number,
): Geometry {
  switch (geometry.type) {
    case "Point":
      return {
        ...geometry,
        coordinates: shift(geometry.coordinates, dLat, dLng),
      };
    case "LineString":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((p) => shift(p, dLat, dLng)),
      };
    case "Polygon":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((ring) =>
          ring.map((p) => shift(p, dLat, dLng)),
        ),
      };
    default:
      return geometry;
  }
}

export function useLiveAnimation(
  mapRef: RefObject<MapRef | null>,
  mapReady: boolean,
  features: Pick<MapFeatures, "live" | "zones">,
  points: LayerPoint[],
  keys: string[],
  selectedKey: string | null,
) {
  const displayed = useRef(new Map<string, Coordinates>());

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map === undefined || !mapReady) {
      return;
    }
    const receivedAt = Date.now();
    const entries = features.live.features.map((feature) => {
      const index = feature.properties.i;
      const point = points[index];
      const key = keys[index];
      const model = motionModel(point, receivedAt);
      const previous = displayed.current.get(key);
      const start = model === null ? point : model(receivedAt);
      const correction: Correction | null =
        previous === undefined
          ? null
          : { dLat: previous.lat - start.lat, dLng: previous.lng - start.lng };
      return { index, key, point, model, correction };
    });
    if (
      entries.every(
        (entry) => entry.model === null && entry.correction === null,
      )
    ) {
      return;
    }

    let frame = 0;
    let lastFrame = 0;
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (time - lastFrame < FRAME_MS) {
        return;
      }
      lastFrame = time;
      const now = Date.now();
      const fade = Math.max(0, 1 - (now - receivedAt) / CORRECTION_MS);
      const deltas = new Map<number, Correction>();
      let selected: Coordinates | null = null;

      for (const entry of entries) {
        const base = entry.model === null ? entry.point : entry.model(now);
        const lat = base.lat + (entry.correction?.dLat ?? 0) * fade;
        const lng = base.lng + (entry.correction?.dLng ?? 0) * fade;
        deltas.set(entry.index, {
          dLat: lat - entry.point.lat,
          dLng: lng - entry.point.lng,
        });
        displayed.current.set(entry.key, { lat, lng });
        if (entry.key === selectedKey) {
          selected = { lat, lng };
        }
      }

      const move = <G extends Geometry, P extends { i: number }>(
        collection: FeatureCollection<G, P>,
      ): FeatureCollection<G, P> => ({
        ...collection,
        features: collection.features.map((feature: Feature<G, P>) => {
          const delta = deltas.get(feature.properties.i);
          return delta === undefined
            ? feature
            : {
                ...feature,
                geometry: shiftGeometry(
                  feature.geometry,
                  delta.dLat,
                  delta.dLng,
                ) as G,
              };
        }),
      });

      map.getSource<GeoJSONSource>("live")?.setData(move(features.live));
      map.getSource<GeoJSONSource>("zones")?.setData(move(features.zones));
      if (selected !== null) {
        const ring: FeatureCollection<Point> = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [selected.lng, selected.lat],
              },
              properties: {},
            },
          ],
        };
        map.getSource<GeoJSONSource>("selection")?.setData(ring);
      }
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [
    mapRef,
    mapReady,
    features.live,
    features.zones,
    points,
    keys,
    selectedKey,
  ]);
}
