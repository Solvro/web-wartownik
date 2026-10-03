import { useNetInfo } from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

export type Connectivity = "online" | "no-network" | "server-down";

const PING_INTERVAL_MS = 30_000;

export function useConnectivity(): Connectivity {
  const trpc = useTRPC();
  const { isConnected, isInternetReachable } = useNetInfo();
  const offline = isConnected === false || isInternetReachable === false;
  const ping = useQuery({
    ...trpc.system.ping.queryOptions(),
    enabled: !offline,
    refetchInterval: PING_INTERVAL_MS,
    retry: 1,
    networkMode: "always",
  });
  if (offline) {
    return "no-network";
  }
  if (ping.isError && ping.failureCount >= 2) {
    return "server-down";
  }
  return "online";
}
