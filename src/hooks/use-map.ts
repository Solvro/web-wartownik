import { use } from "react";

import { MapContext } from "@/lib/providers/map-provider";

export function useMap() {
  const context = use(MapContext);
  if (context === null) {
    throw new Error("useMap must be used within MapContextProvider");
  }
  return context;
}
