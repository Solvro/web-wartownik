import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

const REFRESH_MS = 15_000;

export function useThreatTrack(threatId: string | null) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.threats.track.queryOptions({ id: threatId ?? "none" }),
    enabled: threatId !== null,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
}
