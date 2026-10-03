"use client";

import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "react-use";

import {
  MAPLIBRE_TO_WEB_ZOOM_OFFSET,
  VIEWPORT_DEBOUNCE_MS,
} from "@/config/constants";
import { LAYER_CONFIG } from "@/config/layers";
import { snapBoundsToTiles } from "@/lib/helpers/geo";
import { LAYERS, Layer } from "@/types/layers";
import type {
  EnabledLayers,
  LayerClusterWithLayer,
  LayerData,
  LayerLocation,
  LayerPoint,
} from "@/types/layers";
import type { Viewport } from "@/types/map";

export const layerQueryKey = (layer: Layer) => ["layer", layer] as const;

function viewportSearchParams(viewport: Viewport): string {
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
  return new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, value.toFixed(5)]),
  ).toString();
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
): LayerDataResult {
  const [debouncedViewport, setDebouncedViewport] = useState(viewport);
  useDebounce(() => setDebouncedViewport(viewport), VIEWPORT_DEBOUNCE_MS, [
    viewport,
  ]);

  const viewportParams =
    debouncedViewport === null ? null : viewportSearchParams(debouncedViewport);

  return useQueries({
    queries: LAYERS.map((layer) => {
      const config = LAYER_CONFIG[layer];
      const searchParams =
        config.scope === "global" ? "" : (viewportParams ?? "");
      return {
        queryKey: [...layerQueryKey(layer), searchParams],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const response = await fetch(
            `/api/layers/${config.slug}?${searchParams}`,
            { signal },
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch layer ${layer}`);
          }
          return (await response.json()) as LayerData;
        },
        enabled:
          (enabledLayers[layer] || isAlwaysFetched(layer)) &&
          (config.scope === "global" || viewportParams !== null),
        staleTime: config.staleTime,
        refetchInterval: config.refetchInterval,
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
