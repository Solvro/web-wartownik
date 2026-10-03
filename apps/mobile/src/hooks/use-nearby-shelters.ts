import { useQuery } from "@tanstack/react-query";
import { rankShelters } from "@wartownik/shared/shelters";
import type { RankedShelter } from "@wartownik/shared/shelters";
import type { Coordinates } from "@wartownik/shared/types/map";
import { useMemo } from "react";

import { useOfflinePack } from "@/lib/offline-pack";
import { useTRPC } from "@/lib/trpc";

const NEARBY_RADIUS_KM = 10;

export function useNearbyShelters(
  location: Coordinates | null,
  limit = 5,
): {
  shelters: RankedShelter[];
  source: "live" | "offline" | null;
  isLoading: boolean;
} {
  const trpc = useTRPC();
  const pack = useOfflinePack();
  const origin =
    location === null
      ? null
      : {
          lat: Math.round(location.lat * 1000) / 1000,
          lng: Math.round(location.lng * 1000) / 1000,
        };

  const live = useQuery({
    ...trpc.offline.pack.queryOptions({
      lat: origin?.lat ?? 0,
      lng: origin?.lng ?? 0,
      radiusKm: NEARBY_RADIUS_KM,
    }),
    enabled: origin !== null,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return useMemo(() => {
    if (location === null) {
      return { shelters: [], source: null, isLoading: false };
    }
    if (live.data !== undefined && live.data.shelters.length > 0) {
      return {
        shelters: rankShelters(location, live.data.shelters, limit),
        source: "live",
        isLoading: false,
      };
    }
    if (pack !== null) {
      return {
        shelters: rankShelters(location, pack.shelters, limit),
        source: "offline",
        isLoading: false,
      };
    }
    return { shelters: [], source: null, isLoading: live.isLoading };
  }, [location, live.data, live.isLoading, pack, limit]);
}
