import { useQuery } from "@tanstack/react-query";

import type { AircraftDetails } from "@/types/aircraft";

const REFRESH_MS = 30_000;

export function useAircraftDetails(hex: string | null) {
  return useQuery({
    queryKey: ["aircraft", hex],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/aircraft/${hex}`, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch aircraft ${hex}`);
      }
      return (await response.json()) as AircraftDetails;
    },
    enabled: hex !== null,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
}
