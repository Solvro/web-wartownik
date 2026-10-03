import { Layer } from "../types/layers";

export type LayerScope = "viewport" | "global";

export interface LayerConfig {
  slug: string;
  scope: LayerScope;
  staleTime: number;
  refetchInterval?: number;
  cacheControl: string;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const LAYER_CONFIG: Record<Layer, LayerConfig> = {
  [Layer.Shelters]: {
    slug: "shelters",
    scope: "viewport",
    staleTime: HOUR,
    cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
  },
  [Layer.Drones]: {
    slug: "drones",
    scope: "global",
    staleTime: 10 * SECOND,
    refetchInterval: 15 * SECOND,
    cacheControl: "public, max-age=10, stale-while-revalidate=20",
  },
  [Layer.Aircraft]: {
    slug: "aircraft",
    scope: "global",
    staleTime: 10 * SECOND,
    refetchInterval: 15 * SECOND,
    cacheControl: "public, max-age=10, stale-while-revalidate=20",
  },
  [Layer.Smog]: {
    slug: "smog",
    scope: "viewport",
    staleTime: 10 * MINUTE,
    cacheControl: "public, max-age=600, stale-while-revalidate=1800",
  },
  [Layer.Fires]: {
    slug: "fires",
    scope: "global",
    staleTime: 30 * MINUTE,
    cacheControl: "public, max-age=1800, stale-while-revalidate=3600",
  },
  [Layer.Floods]: {
    slug: "floods",
    scope: "global",
    staleTime: 15 * MINUTE,
    cacheControl: "public, max-age=900, stale-while-revalidate=1800",
  },
  [Layer.AEDs]: {
    slug: "aeds",
    scope: "viewport",
    staleTime: HOUR,
    cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
  },
  [Layer.Reports]: {
    slug: "reports",
    scope: "global",
    staleTime: 30 * SECOND,
    cacheControl: "no-store",
  },
};

export function layerFromSlug(slug: string): Layer | undefined {
  return Object.values(Layer).find(
    (layer) => LAYER_CONFIG[layer].slug === slug,
  );
}
