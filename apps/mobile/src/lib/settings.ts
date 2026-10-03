import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RegionStatus } from "@wartownik/shared/regions";
import { LAYERS, Layer } from "@wartownik/shared/types/layers";
import type { EnabledLayers } from "@wartownik/shared/types/layers";
import { useSyncExternalStore } from "react";

export type AlertThreshold = Exclude<RegionStatus, "none">;

export interface Settings {
  enabledLayers: EnabledLayers;
  watchedRegionIds: string[];
  minStatus: AlertThreshold;
  notificationsEnabled: boolean;
  offlineRadiusKm: 10 | 30 | 50;
}

const STORAGE_KEY = "wartownik-settings";

const DEFAULT_SETTINGS: Settings = {
  enabledLayers: Object.fromEntries(
    LAYERS.map((layer) => [
      layer,
      layer === Layer.Drones ||
        layer === Layer.Shelters ||
        layer === Layer.AEDs,
    ]),
  ) as EnabledLayers,
  watchedRegionIds: [],
  minStatus: "approaching",
  notificationsEnabled: false,
  offlineRadiusKm: 30,
};

let snapshot: Settings = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export async function loadSettings(): Promise<Settings> {
  if (loaded) {
    return snapshot;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      snapshot = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        enabledLayers: {
          ...DEFAULT_SETTINGS.enabledLayers,
          ...parsed.enabledLayers,
        },
      };
    }
  } catch {
    snapshot = DEFAULT_SETTINGS;
  }
  loaded = true;
  emit();
  return snapshot;
}

export function getSettings(): Settings {
  return snapshot;
}

export function updateSettings(patch: Partial<Settings>) {
  snapshot = { ...snapshot, ...patch };
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
