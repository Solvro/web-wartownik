import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

export function useThreatHistory(hours: number, enabled: boolean) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.threats.history.queryOptions({ hours }),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
    placeholderData: keepPreviousData,
  });
}
