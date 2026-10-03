import Cookies from "js-cookie";
import { z } from "zod";

import { ENABLED_LAYERS_COOKIE } from "@/config/constants";
import { LAYERS, Layer } from "@/types/layers";
import type { EnabledLayers } from "@/types/layers";

const DEFAULT_ENABLED = Object.fromEntries(
  LAYERS.map((layer) => [
    layer,
    layer === Layer.Drones || layer === Layer.Shelters,
  ]),
) as EnabledLayers;

const enabledLayersSchema = z.object(
  Object.fromEntries(
    LAYERS.map((layer) => [layer, z.boolean().default(DEFAULT_ENABLED[layer])]),
  ) as Record<Layer, z.ZodDefault<z.ZodBoolean>>,
);

export const DEFAULT_ENABLED_LAYERS = DEFAULT_ENABLED;

function readCookie(): EnabledLayers {
  try {
    const raw = Cookies.get(ENABLED_LAYERS_COOKIE);
    if (raw === undefined) {
      return DEFAULT_ENABLED_LAYERS;
    }
    return enabledLayersSchema.parse(JSON.parse(raw));
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
