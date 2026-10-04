import type { LngLatBounds } from "@maplibre/maplibre-react-native";
import { POLAND_BOUNDS } from "@wartownik/shared/config/constants";
import type { Coordinates } from "@wartownik/shared/types/map";
import { useSyncExternalStore } from "react";

import { API_URL, IS_EXPO_GO } from "./config";

const STYLE_URL = `${API_URL}/api/map/styles/dark`;
const PACK_TAG = "wartownik";
const TILE_COUNT_LIMIT = 20_000;
const KM_PER_DEGREE_LAT = 111.32;

const DETAIL_MAX_ZOOM: Record<10 | 30 | 50, number> = {
  10: 15,
  30: 14,
  50: 13,
};

export type OfflineMapStatus =
  | { state: "idle" }
  | { state: "downloading"; percentage: number }
  | { state: "complete" }
  | { state: "error" };

let status: OfflineMapStatus = { state: "idle" };
const listeners = new Set<() => void>();

function setStatus(next: OfflineMapStatus) {
  status = next;
  for (const listener of listeners) {
    listener();
  }
}

async function offlineManager() {
  const { OfflineManager } = await import("@maplibre/maplibre-react-native");
  return OfflineManager;
}

function boundsAround(center: Coordinates, radiusKm: number): LngLatBounds {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  const dLng =
    radiusKm / (KM_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180));
  return [
    center.lng - dLng,
    center.lat - dLat,
    center.lng + dLng,
    center.lat + dLat,
  ];
}

async function removeOurPacks() {
  const manager = await offlineManager();
  for (const pack of await manager.getPacks()) {
    if (pack.metadata.tag === PACK_TAG) {
      await manager.deletePack(pack.id);
    }
  }
}

export async function downloadOfflineMap(
  center: Coordinates,
  radiusKm: 10 | 30 | 50,
): Promise<void> {
  if (IS_EXPO_GO) {
    return;
  }
  const manager = await offlineManager();
  manager.setTileCountLimit(TILE_COUNT_LIMIT);
  await removeOurPacks();
  setStatus({ state: "downloading", percentage: 0 });

  const regions = [
    {
      bounds: [
        POLAND_BOUNDS.west,
        POLAND_BOUNDS.south,
        POLAND_BOUNDS.east,
        POLAND_BOUNDS.north,
      ] as LngLatBounds,
      minZoom: 0,
      maxZoom: 9,
    },
    {
      bounds: boundsAround(center, radiusKm),
      minZoom: 10,
      maxZoom: DETAIL_MAX_ZOOM[radiusKm],
    },
  ];
  const progress = regions.map(() => 0);

  await Promise.all(
    regions.map(
      (region, index) =>
        new Promise<void>((resolve, reject) => {
          void manager
            .createPack(
              {
                mapStyle: STYLE_URL,
                ...region,
                metadata: { tag: PACK_TAG, createdAt: Date.now() },
              },
              (_, event) => {
                progress[index] = event.percentage;
                if (event.state === "complete") {
                  progress[index] = 100;
                  resolve();
                }
                setStatus({
                  state: "downloading",
                  percentage:
                    progress.reduce((sum, value) => sum + value, 0) /
                    progress.length,
                });
              },
              (_, error) => reject(new Error(error.message)),
            )
            .catch(reject);
        }),
    ),
  ).then(
    () => setStatus({ state: "complete" }),
    (error: unknown) => {
      setStatus({ state: "error" });
      throw error;
    },
  );
}

export async function loadOfflineMapStatus() {
  if (IS_EXPO_GO) {
    return;
  }
  const manager = await offlineManager();
  const packs = (await manager.getPacks()).filter(
    (pack) => pack.metadata.tag === PACK_TAG,
  );
  if (packs.length === 0) {
    return;
  }
  const statuses = await Promise.all(packs.map((pack) => pack.status()));
  if (statuses.every((item) => item.state === "complete")) {
    setStatus({ state: "complete" });
    return;
  }
  setStatus({ state: "error" });
}

export async function deleteOfflineMap() {
  if (IS_EXPO_GO) {
    return;
  }
  await removeOurPacks();
  setStatus({ state: "idle" });
}

export function useOfflineMapStatus(): OfflineMapStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
  );
}
