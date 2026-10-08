"use client";

import { keepPreviousData, useQueries } from "@tanstack/react-query";
import {
  MAPLIBRE_TO_WEB_ZOOM_OFFSET,
  VIEWPORT_DEBOUNCE_MS,
} from "@wartownik/shared/config/constants";
import { LAYER_CONFIG } from "@wartownik/shared/config/layers";
import { snapBoundsToTiles } from "@wartownik/shared/geo/geo";
import { LAYERS, Layer } from "@wartownik/shared/types/layers";
import type {
  EnabledLayers,
  LayerClusterWithLayer,
  LayerLocation,
  LayerPoint,
} from "@wartownik/shared/types/layers";
import type { Viewport } from "@wartownik/shared/types/map";
import { useState } from "react";
import { useDebounce } from "react-use";

import { useTRPC } from "@/lib/trpc";

const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

function viewportInput(viewport: Viewport) {
  const zoom = Math.round(viewport.zoom + MAPLIBRE_TO_WEB_ZOOM_OFFSET);
  const { nw, se } = snapBoundsToTiles(viewport.bounds, zoom);
  const params = {
    west: nw.lng,
    south: se.lat,
    east: se.lng,
    north: nw.lat,
    zoom,
    lat: (nw.lat + se.lat) / 2,
    lng: (nw.lng + se.lng) / 2,
  };
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, round5(value)]),
  ) as typeof params;
}

export type LayerCounts = Partial<Record<Layer, number>>;

export interface LayerDataResult {
  points: LayerPoint[];
  clusters: LayerClusterWithLayer[];
  threats: LayerLocation<Layer.Drones>[];
  counts: LayerCounts;
  isFetching: boolean;
  failedLayers: Layer[];
  emptyLayers: Layer[];
  updatedAt: Partial<Record<Layer, number>>;
}

const isAlwaysFetched = (layer: Layer) => layer === Layer.Drones;

export function useLayerData(
  enabledLayers: EnabledLayers,
  viewport: Viewport | null,
  live = false,
): LayerDataResult {
  const [debouncedViewport, setDebouncedViewport] = useState(viewport);
  useDebounce(() => setDebouncedViewport(viewport), VIEWPORT_DEBOUNCE_MS, [
    viewport,
  ]);

  const trpc = useTRPC();
  const viewportParams =
    debouncedViewport === null ? null : viewportInput(debouncedViewport);

  return useQueries({
    queries: LAYERS.map((layer) => {
      const config = LAYER_CONFIG[layer];
      const input =
        config.scope === "global"
          ? { layer: config.slug }
          : { layer: config.slug, viewport: viewportParams ?? undefined };
      return {
        ...trpc.layers.get.queryOptions(input),
        enabled:
          (enabledLayers[layer] || isAlwaysFetched(layer)) &&
          (config.scope === "global" || viewportParams !== null),
        staleTime: config.staleTime,
        refetchInterval:
          live && layer === Layer.Drones ? false : config.refetchInterval,
        placeholderData: keepPreviousData,
      };
    }),
    combine: (results) => {
      const combined: LayerDataResult = {
        points: [],
        clusters: [],
        threats: [],
        counts: {},
        isFetching: false,
        failedLayers: [],
        emptyLayers: [],
        updatedAt: {},
      };
      results.forEach((result, index) => {
        const layer = LAYERS[index];
        const data = result.data;
        if (layer === Layer.Drones && data !== undefined) {
          combined.threats = data.points as LayerLocation<Layer.Drones>[];
        }
        if (!enabledLayers[layer]) {
          return;
        }
        combined.isFetching ||= result.isFetching;
        if (result.isError) {
          combined.failedLayers.push(layer);
        }
        if (data === undefined) {
          return;
        }
        combined.updatedAt[layer] = result.dataUpdatedAt;
        if (
          result.isSuccess &&
          !result.isPlaceholderData &&
          data.points.length === 0 &&
          data.clusters.length === 0
        ) {
          combined.emptyLayers.push(layer);
        }
        let count = data.points.length;
        for (const point of data.points) {
          combined.points.push({ ...point, layer } as LayerPoint);
        }
        for (const cluster of data.clusters) {
          combined.clusters.push({ ...cluster, layer });
          count += cluster.count;
        }
        combined.counts[layer] = count;
      });
      return combined;
    },
  });
}
