import { useNetInfo } from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

export type Connectivity = "online" | "no-network" | "server-down";

const PING_INTERVAL_MS = 30_000;
const PING_RETRY_INTERVAL_MS = 5_000;

export function useConnectivity(): Connectivity {
  const trpc = useTRPC();
  const { isConnected, isInternetReachable } = useNetInfo();
  const offline = isConnected === false || isInternetReachable === false;
  const ping = useQuery({
    ...trpc.system.ping.queryOptions(),
    enabled: !offline,
    refetchInterval: (query) =>
      query.state.status === "error"
        ? PING_RETRY_INTERVAL_MS
        : PING_INTERVAL_MS,
    retry: 2,
    networkMode: "always",
  });
  if (offline) {
    return "no-network";
  }
  if (ping.isError) {
    return "server-down";
  }
  return "online";
}
