import Cookies from "js-cookie";

import { ENABLED_LAYERS_COOKIE } from "@/config/constants";
import { LAYERS, Layer } from "@/types/layers";
import type { EnabledLayers } from "@/types/layers";

export const DEFAULT_ENABLED_LAYERS = Object.fromEntries(
  LAYERS.map((layer) => [
    layer,
    layer === Layer.Drones || layer === Layer.Shelters,
  ]),
) as EnabledLayers;

function readCookie(): EnabledLayers {
  try {
    const raw = Cookies.get(ENABLED_LAYERS_COOKIE);
    if (raw === undefined) {
      return DEFAULT_ENABLED_LAYERS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_ENABLED_LAYERS;
    }
    const record = parsed as Record<string, unknown>;
    return Object.fromEntries(
      LAYERS.map((layer) => {
        const value = record[layer];
        return [
          layer,
          typeof value === "boolean" ? value : DEFAULT_ENABLED_LAYERS[layer],
        ];
      }),
    ) as EnabledLayers;
  } catch {
    return DEFAULT_ENABLED_LAYERS;
  }
}

let snapshot: EnabledLayers | null = null;
const listeners = new Set<() => void>();

export const enabledLayersStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): EnabledLayers {
    snapshot ??= readCookie();
    return snapshot;
  },
  getServerSnapshot(): EnabledLayers {
    return DEFAULT_ENABLED_LAYERS;
  },
  set(next: EnabledLayers) {
    snapshot = next;
    Cookies.set(ENABLED_LAYERS_COOKIE, JSON.stringify(next), {
      expires: 365,
      path: "/",
      sameSite: "lax",
    });
    for (const listener of listeners) {
      listener();
    }
  },
};
