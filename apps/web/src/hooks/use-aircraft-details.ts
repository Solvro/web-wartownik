import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

const REFRESH_MS = 30_000;

export function useAircraftDetails(hex: string | null) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.aircraft.details.queryOptions({ hex: hex ?? "000000" }),
    enabled: hex !== null,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
}
