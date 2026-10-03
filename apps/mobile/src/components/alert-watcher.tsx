import { REGION_STATUS_RANK } from "@wartownik/shared/regions";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { useLiveData } from "@/hooks/use-live-data";
import { myRegionState } from "@/hooks/use-my-region";
import { useUserLocation } from "@/hooks/use-user-location";
import { useSettings } from "@/lib/settings";

const AUTO_OPEN_RANK = REGION_STATUS_RANK.approaching;

export function AlertWatcher() {
  const settings = useSettings();
  const { location } = useUserLocation();
  const data = useLiveData(settings.enabledLayers, null);
  const region = myRegionState(data.regionStates, location, settings);
  const lastRank = useRef(0);

  const rank = region === undefined ? 0 : REGION_STATUS_RANK[region.status];

  useEffect(() => {
    if (rank >= AUTO_OPEN_RANK && rank > lastRank.current) {
      router.push("/alert");
    }
    lastRank.current = rank;
  }, [rank]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      () => router.push("/alert"),
    );
    return () => subscription.remove();
  }, []);

  return null;
}
