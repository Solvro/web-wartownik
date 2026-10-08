import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { LAYER_CONFIG } from "@wartownik/shared/config/layers";
import { applyRcbAlerts, computeRegionStates } from "@wartownik/shared/regions";
import type { RegionState } from "@wartownik/shared/regions";
import { LAYERS, Layer } from "@wartownik/shared/types/layers";
import type {
  EnabledLayers,
  LayerClusterWithLayer,
  LayerLocation,
  LayerPoint,
} from "@wartownik/shared/types/layers";
import type { RcbAlert } from "@wartownik/shared/types/rcb-alerts";
import { useMemo } from "react";

import { useOfflinePack } from "@/lib/offline-pack";
import type { OfflinePack } from "@/lib/offline-pack";
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

const OFFLINE_LAYERS = new Set([Layer.Shelters, Layer.AEDs]);

function offlinePoints(
  pack: OfflinePack | null,
  layer: Layer,
  viewport: MapViewport | null,
): LayerLocation[] | undefined {
  if (pack === null || viewport === null) {
    return undefined;
  }
  const points = layer === Layer.Shelters ? pack.shelters : pack.aeds;
  return points.filter(
    (point) =>
      point.lng >= viewport.west &&
      point.lng <= viewport.east &&
      point.lat >= viewport.south &&
      point.lat <= viewport.north,
  );
}

export interface LiveData {
  points: LayerPoint[];
  clusters: LayerClusterWithLayer[];
  threats: LayerLocation<Layer.Drones>[];
  regionStates: RegionState[];
  rcbAlerts: RcbAlert[];
  isFetching: boolean;
  failedLayers: Layer[];
  updatedAt: number | undefined;
}

export function useLiveData(
  enabledLayers: EnabledLayers,
  viewport: MapViewport | null,
): LiveData {
  const trpc = useTRPC();
  const pack = useOfflinePack();
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
        const unavailable =
          query.isError || query.isPaused || query.data === undefined;
        const offline =
          OFFLINE_LAYERS.has(layer) && unavailable
            ? offlinePoints(pack, layer, viewport)
            : undefined;
        const fallback =
          offline?.length === 0 && query.data !== undefined
            ? undefined
            : offline;
        if (query.isError && fallback === undefined) {
          failedLayers.push(layer);
        }
        for (const point of fallback ?? query.data?.points ?? []) {
          points.push({ ...point, layer } as LayerPoint);
        }
        if (fallback !== undefined) {
          return;
        }
        for (const cluster of query.data?.clusters ?? []) {
          clusters.push({ ...cluster, layer });
        }
      });
      return { points, clusters, threats, failedLayers, updatedAt, isFetching };
    },
  });

  const { data: rcb } = useQuery({
    ...trpc.alerts.rcb.queryOptions(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const rcbAlerts = useMemo(() => rcb?.alerts ?? [], [rcb]);

  const regionStates = useMemo(
    () =>
      applyRcbAlerts(computeRegionStates(REGIONS, result.threats), rcbAlerts),
    [result.threats, rcbAlerts],
  );

  return { ...result, regionStates, rcbAlerts };
}
