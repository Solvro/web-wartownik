import { getClosestPoints } from "@wartownik/shared/geo/geo";
import type { Layer, LayerLocation } from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { trpcClient } from "./trpc";

export interface OfflinePack {
  center: Coordinates;
  radiusKm: number;
  generatedAt: string;
  shelters: LayerLocation<Layer.Shelters>[];
  aeds: LayerLocation<Layer.AEDs>[];
}

const packFile = () => new File(Paths.document, "offline-pack.json");

let pack: OfflinePack | null | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export async function loadOfflinePack(): Promise<OfflinePack | null> {
  if (pack !== undefined) {
    return pack;
  }
  try {
    const file = packFile();
    pack = file.exists ? (JSON.parse(await file.text()) as OfflinePack) : null;
  } catch {
    pack = null;
  }
  emit();
  return pack;
}

export async function downloadOfflinePack(
  center: Coordinates,
  radiusKm: 10 | 30 | 50,
): Promise<OfflinePack> {
  const result = await trpcClient.offline.pack.query({ ...center, radiusKm });
  const file = packFile();
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(JSON.stringify(result));
  pack = result;
  emit();
  return result;
}

export function deleteOfflinePack() {
  const file = packFile();
  if (file.exists) {
    file.delete();
  }
  pack = null;
  emit();
}

export function useOfflinePack(): OfflinePack | null {
  return (
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => pack,
    ) ?? null
  );
}

export function nearest<T extends Coordinates>(
  origin: Coordinates,
  points: T[],
  count = 3,
) {
  return getClosestPoints(origin, points, count);
}
