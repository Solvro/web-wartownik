import { Suspense, lazy } from "react";

import { WebMapScreen } from "@/components/web-map-screen";
import { IS_EXPO_GO } from "@/lib/config";

const NativeMapScreen = lazy(() =>
  import("@/components/native-map-screen").then((module) => ({
    default: module.NativeMapScreen,
  })),
);

export default function MapTab() {
  if (IS_EXPO_GO) {
    return <WebMapScreen />;
  }
  return (
    <Suspense>
      <NativeMapScreen />
    </Suspense>
  );
}
