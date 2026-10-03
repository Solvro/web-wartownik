import type { RegionState } from "@wartownik/shared/regions";
import type { Coordinates } from "@wartownik/shared/types/map";

import { regionAt } from "@/lib/regions";
import type { Settings } from "@/lib/settings";

export function myRegionState(
  regionStates: RegionState[],
  location: Coordinates | null,
  settings: Settings,
): RegionState | undefined {
  const gpsRegionId =
    location === null ? undefined : regionAt(location)?.properties.id;
  const regionId = gpsRegionId ?? settings.watchedRegionIds[0];
  return regionStates.find((state) => state.id === regionId);
}
