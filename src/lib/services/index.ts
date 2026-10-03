import { Layer } from "@/types/layers";
import type { LayerFetchFunction } from "@/types/layers";

import { getAeds } from "./aeds";
import { getAircraft } from "./aircraft";
import { getDrones } from "./drones";
import { getFires } from "./fires";
import { getFloods } from "./floods";
import { getReports } from "./reports";
import { getShelters } from "./shelters";
import { getAirQuality } from "./smog";

export const LAYER_FETCHERS: { [L in Layer]: LayerFetchFunction<L> } = {
  [Layer.Shelters]: getShelters,
  [Layer.Drones]: getDrones,
  [Layer.Aircraft]: getAircraft,
  [Layer.Smog]: getAirQuality,
  [Layer.Fires]: getFires,
  [Layer.Floods]: getFloods,
  [Layer.AEDs]: getAeds,
  [Layer.Reports]: getReports,
};
