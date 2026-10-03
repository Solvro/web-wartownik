import { Suspense } from "react";
import { preconnect, preload } from "react-dom";

import { MapScreen } from "@/components/map/map-screen";
import { MAP_STYLES } from "@/lib/map/styles";

export default function MapPage() {
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  preload(MAP_STYLES.dark, { as: "fetch", crossOrigin: "anonymous" });
  preload("/geo/regions.json", { as: "fetch", crossOrigin: "anonymous" });

  return (
    <Suspense>
      <MapScreen />
    </Suspense>
  );
}
