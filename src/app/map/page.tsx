import { Suspense } from "react";

import { MapScreen } from "@/components/map/map-screen";

export default function MapPage() {
  return (
    <Suspense>
      <MapScreen />
    </Suspense>
  );
}
