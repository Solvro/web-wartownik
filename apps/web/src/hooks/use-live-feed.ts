"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { LAYER_CONFIG } from "@wartownik/shared/config/layers";
import { Layer } from "@wartownik/shared/types/layers";
import { useState } from "react";

import { useTRPC } from "@/lib/trpc";

export function useLiveFeed(enabled: boolean) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [live, setLive] = useState({ drones: false, ukraine: false });

  const subscription = useSubscription(
    trpc.live.feed.subscriptionOptions(undefined, {
      enabled,
      onData: (data) => {
        if (data.drones !== null) {
          queryClient.setQueryData(
            trpc.layers.get.queryKey({
              layer: LAYER_CONFIG[Layer.Drones].slug,
            }),
            data.drones,
          );
        }
        if (data.ukraine !== null) {
          queryClient.setQueryData(
            trpc.alerts.ukraine.queryKey(),
            data.ukraine,
          );
        }
        setLive((previous) =>
          previous.drones === (data.drones !== null) &&
          previous.ukraine === (data.ukraine !== null)
            ? previous
            : { drones: data.drones !== null, ukraine: data.ukraine !== null },
        );
      },
    }),
  );

  const connected = enabled && subscription.status === "pending";
  return {
    drones: connected && live.drones,
    ukraine: connected && live.ukraine,
  };
}
