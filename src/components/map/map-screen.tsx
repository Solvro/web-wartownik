"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, Megaphone, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAircraftDetails } from "@/hooks/use-aircraft-details";
import { useLayerData } from "@/hooks/use-layer-data";
import { useMap } from "@/hooks/use-map";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStoredFlag } from "@/hooks/use-stored-flag";
import { demoThreats } from "@/lib/demo";
import { pointKeys } from "@/lib/map/features";
import {
  REGION_STATUS_VISUALS,
  computeRegionStates,
  regionBounds,
} from "@/lib/regions";
import type { RegionCollection } from "@/lib/regions";
import { LAYERS, Layer } from "@/types/layers";
import type { LayerPoint } from "@/types/layers";
import type { Coordinates } from "@/types/map";

import { AlertBar } from "./alert-bar";
import { BorderLegend } from "./border-legend";
import { DetailsContent } from "./details-panel";
import { LayerList } from "./layer-list";
import { MapControls } from "./map-controls";
import { RegionContent } from "./region-panel";
import { SearchBox } from "./search-box";
import { SituationCard, sortedAlerts } from "./situation-card";
import { StatusStrip } from "./status-strip";

const MapCanvas = dynamic(
  () => import("./map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 animate-pulse bg-muted" />,
  },
);

const ReportDialog = dynamic(
  () =>
    import("@/components/report-dialog").then((module) => module.ReportDialog),
  { ssr: false },
);

const DEMO_TICK_MS = 2000;

type Selection =
  | { kind: "point"; key: string; point: LayerPoint }
  | { kind: "region"; id: string }
  | null;

function useDemoNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), DEMO_TICK_MS);
    return () => clearInterval(interval);
  }, [enabled]);
  return now;
}

const panelClass =
  "rounded-2xl border bg-background/90 shadow-2xl shadow-black/10 backdrop-blur-xl";

export function MapScreen() {
  const { enabledLayers, viewport, isLocating, fitBounds, flyTo } = useMap();
  const isMobile = useIsMobile();
  const demo = useSearchParams().has("symulacja");
  const demoNow = useDemoNow(demo);
  const [selection, setSelection] = useState<Selection>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [searchMarker, setSearchMarker] = useState<Coordinates | null>(null);
  const [panelOpen, setPanelOpen] = useStoredFlag(
    "defensownik-panel-open",
    true,
  );

  const data = useLayerData(enabledLayers, viewport);

  const { data: regionCollection = null } = useQuery({
    queryKey: ["regions-geometry"],
    queryFn: async () =>
      (await (await fetch("/geo/regions.json")).json()) as RegionCollection,
    staleTime: Infinity,
  });

  const threats = useMemo(
    () => (demo ? [...data.threats, ...demoThreats(demoNow)] : data.threats),
    [demo, data.threats, demoNow],
  );

  const points = useMemo<LayerPoint[]>(() => {
    if (!demo || !enabledLayers[Layer.Drones]) {
      return data.points;
    }
    return [
      ...data.points,
      ...demoThreats(demoNow).map((threat) => ({
        ...threat,
        layer: Layer.Drones as const,
      })),
    ];
  }, [demo, demoNow, data.points, enabledLayers]);

  const keys = useMemo(() => pointKeys(points), [points]);

  const regionStates = useMemo(
    () =>
      regionCollection === null
        ? []
        : computeRegionStates(regionCollection, threats),
    [regionCollection, threats],
  );

  const regions = useMemo<RegionCollection | null>(() => {
    if (regionCollection === null) {
      return null;
    }
    const statusById = new Map(
      regionStates.map((state) => [state.id, state.status]),
    );
    return {
      ...regionCollection,
      features: regionCollection.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          status: statusById.get(feature.properties.id) ?? "none",
        },
      })),
    };
  }, [regionCollection, regionStates]);

  const selectedPoint =
    selection?.kind === "point"
      ? (points[keys.indexOf(selection.key)] ?? selection.point)
      : null;
  const selectedRegion =
    selection?.kind === "region"
      ? regionStates.find((region) => region.id === selection.id)
      : undefined;

  const selectedAircraftHex =
    selectedPoint?.layer === Layer.Aircraft ? selectedPoint.meta.id : null;
  const { data: aircraftDetails } = useAircraftDetails(selectedAircraftHex);
  const history = useMemo(() => {
    if (
      selectedPoint?.layer !== Layer.Aircraft ||
      aircraftDetails === undefined
    ) {
      return [];
    }
    return [...aircraftDetails.track, selectedPoint];
  }, [selectedPoint, aircraftDetails]);

  const selectPoint = useCallback(
    (index: number) => {
      const point = points[index];
      if (point !== undefined) {
        setSelection({ kind: "point", key: keys[index], point });
      }
    },
    [points, keys],
  );

  const zoomToRegion = useCallback(
    (regionId: string) => {
      const feature = regionCollection?.features.find(
        (region) => region.properties.id === regionId,
      );
      if (feature !== undefined) {
        fitBounds(regionBounds(feature));
      }
    },
    [regionCollection, fitBounds],
  );

  const openRegion = useCallback(
    (regionId: string) => setSelection({ kind: "region", id: regionId }),
    [],
  );

  const openRegionAndZoom = useCallback(
    (regionId: string) => {
      openRegion(regionId);
      zoomToRegion(regionId);
      setLayersOpen(false);
    },
    [openRegion, zoomToRegion],
  );

  const selectThreat = useCallback(
    (threatId: string) => {
      const threat = threats.find((item) => item.meta.id === threatId);
      if (threat === undefined) {
        return;
      }
      setSelection({
        kind: "point",
        key: `${Layer.Drones}:${threatId}`,
        point: { ...threat, layer: Layer.Drones },
      });
      flyTo(threat, 9);
    },
    [threats, flyTo],
  );

  const topAlert = sortedAlerts(regionStates)[0];
  const collapsedAlertColor =
    topAlert === undefined
      ? null
      : REGION_STATUS_VISUALS[topAlert.status].color;

  const loadingLayers = data.isFetching
    ? LAYERS.filter(
        (layer) => enabledLayers[layer] && data.updatedAt[layer] === undefined,
      )
    : [];

  const situation = (
    <SituationCard
      regions={regionStates}
      threatCount={threats.length}
      updatedAt={data.updatedAt[Layer.Drones]}
      demo={demo}
      onSelectRegion={openRegionAndZoom}
    />
  );

  const borderLegend = <BorderLegend />;

  const layerList = (
    <LayerList
      counts={data.counts}
      loadingLayers={loadingLayers}
      failedLayers={data.failedLayers}
    />
  );

  const closeSelection = () => setSelection(null);
  const selectionContent =
    selectedPoint !== null ? (
      <DetailsContent point={selectedPoint} onClose={closeSelection} />
    ) : selectedRegion !== undefined ? (
      <RegionContent
        region={selectedRegion}
        threats={threats}
        onZoom={() => zoomToRegion(selectedRegion.id)}
        onSelectThreat={selectThreat}
        onClose={closeSelection}
      />
    ) : null;

  return (
    <main className="fixed inset-0 overflow-hidden">
      <MapCanvas
        sidePadding={isMobile || !panelOpen ? 0 : 392}
        searchMarker={searchMarker}
        history={history}
        points={points}
        keys={keys}
        clusters={data.clusters}
        regions={regions}
        selectedKey={
          selectedPoint === null
            ? null
            : selection?.kind === "point"
              ? selection.key
              : null
        }
        hoveredRegionId={hoveredRegionId}
        onSelectPoint={selectPoint}
        onSelectRegion={openRegion}
        onHoverRegion={setHoveredRegionId}
      />

      {isMobile ? (
        <>
          <div
            className={`${panelClass} absolute inset-x-3 top-3 z-20 flex items-center gap-2 p-2`}
          >
            <Link href="/" aria-label="Defensownik">
              <Brand className="[&>span:last-child]:hidden" />
            </Link>
            <SearchBox className="flex-1" onSelectResult={setSearchMarker} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLayersOpen(true)}
              aria-label="Warstwy"
            >
              <Layers />
            </Button>
          </div>
          <div className="absolute inset-x-3 top-20 z-10 flex flex-col items-center gap-2">
            <AlertBar
              regions={regionStates}
              onSelectRegion={openRegionAndZoom}
            />
            <StatusStrip
              isFetching={data.isFetching}
              isLocating={isLocating}
              failedLayers={data.failedLayers}
              emptyLayers={data.emptyLayers}
            />
          </div>
          <MapControls className="absolute right-3 bottom-40 z-10" />
          <button
            type="button"
            onClick={() => setLayersOpen(true)}
            className="absolute inset-x-3 bottom-12 z-10 text-left shadow-2xl"
          >
            {situation}
          </button>

          <Drawer open={layersOpen} onOpenChange={setLayersOpen}>
            <DrawerContent className="max-h-[85dvh]">
              <DrawerTitle className="sr-only">Warstwy</DrawerTitle>
              <div className="flex flex-col gap-3 overflow-y-auto p-4 *:shrink-0">
                {situation}
                {borderLegend}
                {layerList}
                <Button
                  onClick={() => {
                    setLayersOpen(false);
                    setReportOpen(true);
                  }}
                >
                  <Megaphone />
                  Zgłoś zdarzenie
                </Button>
                <div className="flex items-center justify-between">
                  <PanelLinks />
                  <ThemeToggle />
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          <Drawer
            open={selectionContent !== null}
            onOpenChange={(open) => {
              if (!open) closeSelection();
            }}
          >
            <DrawerContent className="max-h-[80dvh]">
              <DrawerTitle className="sr-only">Szczegóły</DrawerTitle>
              <div className="overflow-y-auto p-4">{selectionContent}</div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <>
          {panelOpen ? null : (
            <CollapsedPanel
              alertColor={collapsedAlertColor}
              onOpen={() => setPanelOpen(true)}
            />
          )}
          <aside
            aria-hidden={!panelOpen}
            inert={!panelOpen}
            className={`${panelClass} absolute top-3 bottom-3 left-3 z-20 flex w-[380px] flex-col transition-[translate,opacity] duration-300 ${panelOpen ? "" : "pointer-events-none -translate-x-[calc(100%+1rem)] opacity-0"}`}
          >
            <div className="flex items-center justify-between gap-2 p-4 pb-3">
              <Link href="/">
                <Brand />
              </Link>
              <div className="flex items-center">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPanelOpen(false)}
                  tooltip="Ukryj panel"
                  aria-label="Ukryj panel"
                >
                  <PanelLeftClose />
                </Button>
              </div>
            </div>
            <div className="px-4 pb-3">
              <SearchBox onSelectResult={setSearchMarker} />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div className="flex flex-col gap-2">
                  {situation}
                  {borderLegend}
                </div>
                <div>
                  <h2 className="mb-1.5 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Warstwy
                  </h2>
                  {layerList}
                </div>
              </div>
            </ScrollArea>
            <div className="flex flex-col gap-3 border-t p-4">
              <Button onClick={() => setReportOpen(true)}>
                <Megaphone />
                Zgłoś zdarzenie
              </Button>
              <PanelLinks />
            </div>
          </aside>

          <div
            className={`pointer-events-none absolute top-3 right-3 ${panelOpen ? "left-[404px]" : "left-3"} z-10 flex flex-col items-center gap-2 transition-[left] duration-300`}
          >
            <AlertBar
              regions={regionStates}
              onSelectRegion={openRegionAndZoom}
            />
          </div>

          {selectionContent === null ? null : (
            <aside
              key={selection?.kind === "point" ? selection.key : selection?.id}
              className={`${panelClass} absolute top-16 right-3 z-20 max-h-[calc(100dvh-5rem)] w-[380px] animate-in overflow-y-auto p-4 fade-in slide-in-from-right-4`}
            >
              {selectionContent}
            </aside>
          )}

          <StatusStrip
            className={`absolute right-3 bottom-12 z-10 transition-[left] duration-300 ${panelOpen ? "left-[404px]" : "left-3"}`}
            isFetching={data.isFetching}
            isLocating={isLocating}
            failedLayers={data.failedLayers}
            emptyLayers={data.emptyLayers}
          />
          <MapControls className="absolute right-3 bottom-10 z-10" />
        </>
      )}

      {reportOpen ? (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} />
      ) : null}
    </main>
  );
}

function CollapsedPanel({
  alertColor,
  onOpen,
}: {
  alertColor: string | null;
  onOpen(): void;
}) {
  return (
    <div
      className={`${panelClass} absolute top-3 left-3 z-20 flex animate-in items-center gap-1 p-1.5 fade-in slide-in-from-left-2`}
    >
      <Link href="/" aria-label="Defensownik" className="px-1">
        <Brand className="[&>span:last-child]:hidden" />
      </Link>
      <Button variant="ghost" onClick={onOpen} className="gap-2">
        <PanelLeftOpen />
        Pokaż panel
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: alertColor ?? "#16a34a" }}
        />
      </Button>
    </div>
  );
}

function PanelLinks() {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Nieoficjalne źródło dodatkowe – nie zastępuje syren ani alertów RCB.{" "}
      <Link
        href="/privacy-policy"
        className="underline-offset-2 hover:underline"
      >
        Prywatność
      </Link>
      {" · "}
      <Link
        href="/terms-of-service"
        className="underline-offset-2 hover:underline"
      >
        Warunki
      </Link>
    </p>
  );
}
