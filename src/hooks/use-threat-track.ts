import { useQuery } from "@tanstack/react-query";

import type { ThreatTrackPoint } from "@/types/threat-track";

const REFRESH_MS = 15_000;

export function useThreatTrack(threatId: string | null) {
  return useQuery({
    queryKey: ["threat-track", threatId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/threats/${threatId}/track`, {
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch track ${threatId}`);
      }
      return ((await response.json()) as { track: ThreatTrackPoint[] }).track;
    },
    enabled: threatId !== null,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
}
