import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { Crosshair, Layers, Megaphone, Scan } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertBar } from "@/components/alert-bar";
import { ConnectivityBanner } from "@/components/connectivity-banner";
import { LayerToggles } from "@/components/layer-toggles";
import { MapCanvas } from "@/components/map-canvas";
import type { MapCanvasHandle } from "@/components/map-canvas";
import { PointDetails } from "@/components/point-details";
import { RegionDetails } from "@/components/region-details";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useLiveData } from "@/hooks/use-live-data";
import type { MapViewport } from "@/hooks/use-live-data";
import { useSelectedTrack } from "@/hooks/use-selected-track";
import { useUserLocation } from "@/hooks/use-user-location";
import { notifyEscalations } from "@/lib/notifications";
import { getSettings, useSettings } from "@/lib/settings";
import { colors, radius } from "@/lib/theme";

type Selection =
  { kind: "point"; index: number } | { kind: "region"; id: string } | null;

function MapButton({
  onPress,
  children,
}: {
  onPress(): void;
  children: React.ReactNode;
}) {
  return (
    <Pressable style={styles.mapButton} onPress={onPress}>
      {children}
    </Pressable>
  );
}

export function NativeMapScreen() {
  const settings = useSettings();
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const map = useRef<MapCanvasHandle>(null);
  const detailsSheet = useRef<BottomSheet>(null);
  const layersSheet = useRef<BottomSheet>(null);
  const connectivity = useConnectivity();
  const { location, refresh } = useUserLocation();
  const data = useLiveData(settings.enabledLayers, viewport);

  useEffect(() => {
    void notifyEscalations(data.regionStates, getSettings()).catch(
      () => undefined,
    );
  }, [data.regionStates]);

  const selectedPoint =
    selection?.kind === "point" ? data.points[selection.index] : undefined;
  const track = useSelectedTrack(selectedPoint);
  const selectedRegion =
    selection?.kind === "region"
      ? data.regionStates.find((region) => region.id === selection.id)
      : undefined;

  const select = (next: Selection) => {
    setSelection(next);
    layersSheet.current?.close();
    detailsSheet.current?.snapToIndex(0);
  };

  return (
    <View style={styles.screen}>
      <MapCanvas
        ref={map}
        history={track.history}
        historyColor={track.color}
        points={data.points}
        clusters={data.clusters}
        regionStates={data.regionStates}
        showUserLocation={location !== null}
        onViewportChange={setViewport}
        onSelectPoint={(index) => select({ kind: "point", index })}
        onSelectRegion={(id) => select({ kind: "region", id })}
      />

      <SafeAreaView
        edges={["top"]}
        style={styles.overlay}
        pointerEvents="box-none"
      >
        <View style={styles.topStack} pointerEvents="box-none">
          <ConnectivityBanner
            connectivity={connectivity}
            updatedAt={data.updatedAt}
          />
          <AlertBar
            regions={data.regionStates}
            onPress={(region) => select({ kind: "region", id: region.id })}
          />
        </View>
        <View style={styles.controls}>
          <MapButton
            onPress={() => {
              detailsSheet.current?.close();
              layersSheet.current?.snapToIndex(0);
            }}
          >
            <Layers color={colors.text} size={20} />
          </MapButton>
          <MapButton
            onPress={() =>
              void refresh().then((next) => {
                if (next !== null) {
                  map.current?.flyTo(next, 13);
                }
              })
            }
          >
            <Crosshair color={colors.text} size={20} />
          </MapButton>
          <MapButton onPress={() => map.current?.fitPoland()}>
            <Scan color={colors.text} size={20} />
          </MapButton>
        </View>
      </SafeAreaView>

      <Pressable
        style={styles.reportButton}
        onPress={() => router.push("/report")}
      >
        <Megaphone color="#fff" size={18} />
        <Text style={styles.reportText}>Zgłoś</Text>
      </Pressable>

      <BottomSheet
        ref={detailsSheet}
        index={-1}
        snapPoints={["45%", "85%"]}
        enablePanDownToClose
        onClose={() => setSelection(null)}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {selectedPoint !== undefined ? (
            <PointDetails point={selectedPoint} userLocation={location} />
          ) : selectedRegion !== undefined ? (
            <RegionDetails region={selectedRegion} threats={data.threats} />
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet
        ref={layersSheet}
        index={-1}
        snapPoints={["60%", "90%"]}
        enablePanDownToClose
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Warstwy</Text>
          <LayerToggles failedLayers={data.failedLayers} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  topStack: { gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  controls: { position: "absolute", right: 12, bottom: 24, gap: 8 },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.92)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportButton: {
    position: "absolute",
    left: 12,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reportText: { color: "#fff", fontWeight: "700" },
  sheet: { backgroundColor: colors.surface },
  handle: { backgroundColor: colors.border },
  sheetContent: { padding: 16, paddingBottom: 40, gap: 12 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
});
