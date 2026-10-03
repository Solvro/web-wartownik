import { LAYER_CONFIG } from "@defensownik/shared/config/layers";
import { computeRegionStates } from "@defensownik/shared/regions";
import type { RegionState } from "@defensownik/shared/regions";
import { LAYERS, Layer } from "@defensownik/shared/types/layers";
import type {
  EnabledLayers,
  LayerClusterWithLayer,
  LayerLocation,
  LayerPoint,
} from "@defensownik/shared/types/layers";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { REGIONS } from "@/lib/regions";
import { useTRPC } from "@/lib/trpc";

export interface MapViewport {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}

const round = (value: number, step: number) => Math.round(value / step) * step;

function viewportInput(viewport: MapViewport) {
  const zoom = Math.round(viewport.zoom + 1);
  const step = 360 / 2 ** zoom;
  const west = round(viewport.west - step / 2, step);
  const east = round(viewport.east + step / 2, step);
  const south = round(viewport.south - step / 2, step);
  const north = round(viewport.north + step / 2, step);
  return {
    west: Math.max(-180, west),
    east: Math.min(180, east),
    south: Math.max(-90, south),
    north: Math.min(90, north),
    zoom,
    lat: (north + south) / 2,
    lng: (east + west) / 2,
  };
}

export interface LiveData {
  points: LayerPoint[];
  clusters: LayerClusterWithLayer[];
  threats: LayerLocation<Layer.Drones>[];
  regionStates: RegionState[];
  isFetching: boolean;
  failedLayers: Layer[];
  updatedAt: number | undefined;
}

export function useLiveData(
  enabledLayers: EnabledLayers,
  viewport: MapViewport | null,
): LiveData {
  const trpc = useTRPC();
  const viewportParams =
    viewport === null ? undefined : viewportInput(viewport);

  const result = useQueries({
    queries: LAYERS.map((layer) => {
      const config = LAYER_CONFIG[layer];
      const isGlobal = config.scope === "global";
      return {
        ...trpc.layers.get.queryOptions(
          isGlobal
            ? { layer: config.slug }
            : { layer: config.slug, viewport: viewportParams },
        ),
        enabled:
          (enabledLayers[layer] || layer === Layer.Drones) &&
          (isGlobal || viewportParams !== undefined),
        staleTime: config.staleTime,
        refetchInterval: config.refetchInterval,
        placeholderData: keepPreviousData,
      };
    }),
    combine: (results) => {
      const points: LayerPoint[] = [];
      const clusters: LayerClusterWithLayer[] = [];
      const failedLayers: Layer[] = [];
      let threats: LayerLocation<Layer.Drones>[] = [];
      let updatedAt: number | undefined;
      let isFetching = false;
      results.forEach((query, index) => {
        const layer = LAYERS[index];
        if (layer === Layer.Drones && query.data !== undefined) {
          threats = query.data.points as LayerLocation<Layer.Drones>[];
          updatedAt = query.dataUpdatedAt;
        }
        if (!enabledLayers[layer]) {
          return;
        }
        isFetching ||= query.isFetching;
        if (query.isError) {
          failedLayers.push(layer);
        }
        for (const point of query.data?.points ?? []) {
          points.push({ ...point, layer } as LayerPoint);
        }
        for (const cluster of query.data?.clusters ?? []) {
          clusters.push({ ...cluster, layer });
        }
      });
      return { points, clusters, threats, failedLayers, updatedAt, isFetching };
    },
  });

  const regionStates = useMemo(
    () => computeRegionStates(REGIONS, result.threats),
    [result.threats],
  );

  return { ...result, regionStates };
}
