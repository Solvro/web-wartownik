"use client";

import { useQuery } from "@tanstack/react-query";
import { demoThreats } from "@wartownik/shared/demo";
import { presentPoint } from "@wartownik/shared/presentation/index";
import {
  REGION_STATUS_VISUALS,
  applyRcbAlerts,
  computeRegionStates,
  regionBounds,
} from "@wartownik/shared/regions";
import type { RegionCollection, RegionStatus } from "@wartownik/shared/regions";
import {
  isTrackVisibleAt,
  threatsAt,
  trackPathUntil,
} from "@wartownik/shared/threat-history";
import { LAYERS, Layer } from "@wartownik/shared/types/layers";
import type { LayerLocation, LayerPoint } from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
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
import { GEO_URLS } from "@/config/geo";
import { useAircraftDetails } from "@/hooks/use-aircraft-details";
import { useLayerData } from "@/hooks/use-layer-data";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { useMap } from "@/hooks/use-map";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStoredFlag } from "@/hooks/use-stored-flag";
import { useThreatHistory } from "@/hooks/use-threat-history";
import { useThreatTrack } from "@/hooks/use-threat-track";
import { pointKeys } from "@/lib/map/features";
import { useTRPC } from "@/lib/trpc";

import { AirspaceToggle, AirspaceZoneContent } from "./airspace-zones";
import { AlertBar } from "./alert-bar";
import { BorderLegend } from "./border-legend";
import { DetailsContent } from "./details-panel";
import { LayerList } from "./layer-list";
import type { MapTrail } from "./map-canvas";
import { MapControls } from "./map-controls";
import { RcbAlertContent, RcbAlertsCard } from "./rcb-alerts";
import { RegionContent } from "./region-panel";
import { SearchBox } from "./search-box";
import { SituationCard, sortedAlerts } from "./situation-card";
import { StatusStrip } from "./status-strip";
import {
  TIMELINE_SPEEDS,
  Timeline,
  TimelineButton,
  usePlayback,
} from "./timeline";
import { UkraineAlertContent, UkraineAlertsToggle } from "./ukraine-alerts";

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
  | { kind: "ua-raion"; id: string }
  | { kind: "rcb"; id: string }
  | { kind: "airspace"; id: string }
  | null;

interface RaionInfo {
  id: string;
  name: string;
  oblastId: string;
}

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
  const [layersOpen, setLayersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [searchMarker, setSearchMarker] = useState<Coordinates | null>(null);
  const [panelOpen, setPanelOpen] = useStoredFlag("wartownik-panel-open", true);

  const [ukraineAlertsEnabled, setUkraineAlertsEnabled] = useStoredFlag(
    "wartownik-ua-alerts",
    true,
  );
  const [airspaceEnabled, setAirspaceEnabled] = useStoredFlag(
    "wartownik-airspace",
    false,
  );
  const trpc = useTRPC();

  const live = useLiveFeed(true);
  const data = useLayerData(enabledLayers, viewport, live.drones);

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineHours, setTimelineHours] = useState<number>(24);
  const [timelineSpeed, setTimelineSpeed] = useState<number>(
    TIMELINE_SPEEDS[1],
  );
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelinePick, setTimelinePick] = useState<number | null>(null);
  const threatHistory = useThreatHistory(timelineHours, timelineOpen);
  const historyData = timelineOpen ? threatHistory.data : undefined;
  const [timelineOpenedAt, setTimelineOpenedAt] = useState(0);
  const historyTo = historyData?.to ?? timelineOpenedAt;
  const historyFrom = historyData?.from ?? historyTo;
  const firstActivity = useMemo(
    () =>
      historyData?.tracks.reduce(
        (earliest, track) =>
          Math.min(earliest, track.samples[0]?.[2] ?? Infinity),
        Infinity,
      ) ?? Infinity,
    [historyData],
  );
  const timelineTime = Math.min(
    Math.max(
      timelinePick ??
        (Number.isFinite(firstActivity) ? firstActivity : historyTo),
      historyFrom,
    ),
    historyTo,
  );
  const setTimelineTime = setTimelinePick;
  usePlayback({
    playing: timelinePlaying,
    speed: timelineSpeed,
    onTick: (delta) => {
      const next = timelineTime + delta;
      if (next >= historyTo) {
        setTimelineTime(historyTo);
        setTimelinePlaying(false);
      } else {
        setTimelineTime(next);
      }
    },
  });
  const openTimeline = () => {
    setTimelineOpen(true);
    setTimelineOpenedAt(Date.now());
    setTimelinePick(null);
    setSelection(null);
    setLayersOpen(false);
  };
  const closeTimeline = () => {
    setTimelineOpen(false);
    setTimelinePlaying(false);
    setSelection(null);
  };
  const historicalThreats = useMemo(
    () =>
      historyData === undefined ? null : threatsAt(historyData, timelineTime),
    [historyData, timelineTime],
  );
  const trails = useMemo<MapTrail[]>(() => {
    if (historyData === undefined) {
      return [];
    }
    return historyData.tracks.flatMap((track) => {
      if ((track.samples[0]?.[2] ?? Infinity) > timelineTime) {
        return [];
      }
      const color = presentPoint({
        layer: Layer.Drones,
        lat: track.samples[0][0],
        lng: track.samples[0][1],
        meta: { type: track.type } as LayerLocation<Layer.Drones>["meta"],
      }).color;
      return [
        {
          coordinates: trackPathUntil(track, timelineTime),
          color,
          active: isTrackVisibleAt(track, timelineTime),
        },
      ];
    });
  }, [historyData, timelineTime]);

  const { data: ukraineAlerts } = useQuery({
    ...trpc.alerts.ukraine.queryOptions(),
    enabled: ukraineAlertsEnabled,
    refetchInterval: live.ukraine ? false : 30_000,
    staleTime: 20_000,
  });

  const { data: rcbAlerts } = useQuery({
    ...trpc.alerts.rcb.queryOptions(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const rcbAlertList = useMemo(() => rcbAlerts?.alerts ?? [], [rcbAlerts]);

  const { data: airspaceZones } = useQuery({
    ...trpc.airspace.zones.queryOptions(),
    enabled: airspaceEnabled,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });
  const visibleAirspaceZones = airspaceEnabled ? (airspaceZones ?? null) : null;
  const visibleUkraineAlerts = ukraineAlertsEnabled
    ? (ukraineAlerts ?? null)
    : null;

  const { data: raionInfo } = useQuery({
    queryKey: ["ukraine-raions", GEO_URLS.ukraineRaions],
    queryFn: async () => {
      const collection = (await (
        await fetch(GEO_URLS.ukraineRaions)
      ).json()) as {
        features: { properties: RaionInfo }[];
      };
      return new Map(
        collection.features.map(({ properties }) => [
          properties.id,
          properties,
        ]),
      );
    },
    enabled: ukraineAlertsEnabled,
    staleTime: Infinity,
  });

  const { data: regionCollection = null } = useQuery({
    queryKey: ["regions-geometry", GEO_URLS.regions],
    queryFn: async () =>
      (await (await fetch(GEO_URLS.regions)).json()) as RegionCollection,
    staleTime: Infinity,
  });

  const threats = useMemo(
    () =>
      historicalThreats !== null
        ? historicalThreats
        : demo
          ? [...data.threats, ...demoThreats(demoNow)]
          : data.threats,
    [historicalThreats, demo, data.threats, demoNow],
  );

  const points = useMemo<LayerPoint[]>(() => {
    if (historicalThreats !== null) {
      return [
        ...data.points.filter((point) => point.layer !== Layer.Drones),
        ...historicalThreats.map((threat) => ({
          ...threat,
          layer: Layer.Drones as const,
        })),
      ];
    }
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
  }, [historicalThreats, demo, demoNow, data.points, enabledLayers]);

  const keys = useMemo(() => pointKeys(points), [points]);

  const regionStates = useMemo(
    () =>
      regionCollection === null
        ? []
        : applyRcbAlerts(
            computeRegionStates(regionCollection, threats),
            historicalThreats === null ? rcbAlertList : [],
          ),
    [regionCollection, threats, historicalThreats, rcbAlertList],
  );

  const regionStatusKey = regionStates
    .map((state) => `${state.id}:${state.status}`)
    .join("|");
  const regionStatuses = useMemo<Record<string, RegionStatus>>(
    () =>
      Object.fromEntries(
        regionStatusKey
          .split("|")
          .filter(Boolean)
          .map((entry) => entry.split(":") as [string, RegionStatus]),
      ),
    [regionStatusKey],
  );

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
  const selectedThreatId =
    selectedPoint?.layer === Layer.Drones && selectedPoint.meta.demo !== true
      ? selectedPoint.meta.id
      : null;
  const { data: threatTrack } = useThreatTrack(selectedThreatId);
  const history = useMemo(() => {
    if (
      selectedPoint?.layer === Layer.Aircraft &&
      aircraftDetails !== undefined
    ) {
      return [...aircraftDetails.track, selectedPoint];
    }
    if (selectedPoint?.layer === Layer.Drones && threatTrack !== undefined) {
      return threatTrack;
    }
    return [];
  }, [selectedPoint, aircraftDetails, threatTrack]);
  const historyColor =
    selectedPoint?.layer === Layer.Drones
      ? presentPoint(selectedPoint).color
      : undefined;

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
      updatedAt={
        historicalThreats === null ? data.updatedAt[Layer.Drones] : timelineTime
      }
      demo={demo}
      historical={historicalThreats !== null}
      onSelectRegion={openRegionAndZoom}
    />
  );

  const borderLegend = <BorderLegend />;

  const timelineButton = <TimelineButton onClick={openTimeline} />;
  const timeline = timelineOpen ? (
    <Timeline
      history={historyData}
      isLoading={threatHistory.isFetching}
      time={timelineTime}
      hours={timelineHours}
      speed={timelineSpeed}
      playing={timelinePlaying}
      activeCount={historicalThreats?.length ?? 0}
      onTimeChange={(time) => {
        setTimelineTime(time);
      }}
      onHoursChange={(hours) => {
        setTimelineHours(hours);
        setTimelinePick(null);
      }}
      onSpeedChange={setTimelineSpeed}
      onTogglePlay={() => {
        if (!timelinePlaying && timelineTime >= historyTo) {
          setTimelineTime(historyFrom);
        }
        setTimelinePlaying(!timelinePlaying);
      }}
      onClose={closeTimeline}
    />
  ) : null;

  const layerList = (
    <div className="flex flex-col gap-1">
      <LayerList
        counts={data.counts}
        loadingLayers={loadingLayers}
        failedLayers={data.failedLayers}
      />
      <UkraineAlertsToggle
        enabled={ukraineAlertsEnabled}
        count={
          ukraineAlerts === undefined
            ? undefined
            : ukraineAlerts.oblasts.length + ukraineAlerts.raions.length
        }
        onChange={setUkraineAlertsEnabled}
      />
      <AirspaceToggle
        enabled={airspaceEnabled}
        count={airspaceZones?.features.length}
        onChange={setAirspaceEnabled}
      />
    </div>
  );

  const regionLabel = (regionId: string) =>
    regionCollection?.features.find(
      (feature) => feature.properties.id === regionId,
    )?.properties.label ?? regionId;
  const selectedRaionAlert =
    selection?.kind === "ua-raion"
      ? visibleUkraineAlerts?.raions.find(
          (alert) => alert.raionId === selection.id,
        )
      : undefined;
  const selectedOblastAlert =
    selection?.kind === "region"
      ? visibleUkraineAlerts?.oblasts.find(
          (alert) => alert.oblastId === selection.id,
        )
      : undefined;

  const selectedAirspaceZone =
    selection?.kind === "airspace"
      ? visibleAirspaceZones?.features.find(
          (feature) => feature.properties.id === selection.id,
        )?.properties
      : undefined;

  const selectedRcbAlert =
    selection?.kind === "rcb"
      ? rcbAlertList.find((alert) => alert.id === selection.id)
      : undefined;

  const rcbCard = (
    <RcbAlertsCard
      alerts={rcbAlertList}
      regionLabel={regionLabel}
      onSelect={(id) => {
        setSelection({ kind: "rcb", id });
        setLayersOpen(false);
      }}
    />
  );

  const closeSelection = () => setSelection(null);
  const selectionContent =
    selectedAirspaceZone !== undefined ? (
      <AirspaceZoneContent
        zone={selectedAirspaceZone}
        regionLabel={regionLabel}
        onSelectRegion={openRegionAndZoom}
        onClose={closeSelection}
      />
    ) : selectedRcbAlert !== undefined ? (
      <RcbAlertContent
        alert={selectedRcbAlert}
        regionLabel={regionLabel}
        onClose={closeSelection}
      />
    ) : selectedRaionAlert !== undefined ? (
      <UkraineAlertContent
        title={`rejon ${raionInfo?.get(selectedRaionAlert.raionId)?.name ?? ""} · ${regionLabel(selectedRaionAlert.oblastId)}`}
        alert={selectedRaionAlert}
        onClose={closeSelection}
      />
    ) : selectedOblastAlert !== undefined ? (
      <UkraineAlertContent
        title={regionLabel(selectedOblastAlert.oblastId)}
        alert={selectedOblastAlert}
        onClose={closeSelection}
      />
    ) : selectedPoint !== null ? (
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
        trails={trails}
        historyColor={historyColor}
        historyMarkers={selectedPoint?.layer === Layer.Drones}
        points={points}
        keys={keys}
        clusters={data.clusters}
        regions={regionCollection}
        regionStatuses={regionStatuses}
        ukraineAlerts={timelineOpen ? null : visibleUkraineAlerts}
        onSelectUkraineAlert={(id) => setSelection({ kind: "ua-raion", id })}
        airspaceZones={timelineOpen ? null : visibleAirspaceZones}
        selectedAirspaceZone={
          selectedAirspaceZone === undefined ? null : selectedAirspaceZone.id
        }
        onSelectAirspaceZone={(id) => setSelection({ kind: "airspace", id })}
        selectedKey={
          selectedPoint === null
            ? null
            : selection?.kind === "point"
              ? selection.key
              : null
        }
        onSelectPoint={selectPoint}
        onSelectRegion={openRegion}
      />

      {isMobile ? (
        <>
          <div
            className={`${panelClass} absolute inset-x-3 top-3 z-20 flex items-center gap-2 p-2`}
          >
            <Link href="/" aria-label="Wartownik">
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
          {timeline === null ? (
            <button
              type="button"
              onClick={() => setLayersOpen(true)}
              className="absolute inset-x-3 bottom-12 z-10 text-left shadow-2xl"
            >
              {situation}
            </button>
          ) : (
            <div className="absolute inset-x-3 bottom-12 z-10">{timeline}</div>
          )}

          <Drawer open={layersOpen} onOpenChange={setLayersOpen}>
            <DrawerContent className="max-h-[85dvh]">
              <DrawerTitle className="sr-only">Warstwy</DrawerTitle>
              <div className="flex flex-col gap-3 overflow-y-auto p-4 *:shrink-0">
                {situation}
                {rcbCard}
                {timelineButton}
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
                  {rcbCard}
                  {timelineButton}
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

          {timeline === null ? (
            <StatusStrip
              className={`absolute right-3 bottom-12 z-10 transition-[left] duration-300 ${panelOpen ? "left-[404px]" : "left-3"}`}
              isFetching={data.isFetching}
              isLocating={isLocating}
              failedLayers={data.failedLayers}
              emptyLayers={data.emptyLayers}
            />
          ) : (
            <div
              className={`absolute right-16 bottom-10 z-10 flex justify-center transition-[left] duration-300 ${panelOpen ? "left-[404px]" : "left-3"}`}
            >
              <div className="w-full max-w-3xl">{timeline}</div>
            </div>
          )}
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
      <Link href="/" aria-label="Wartownik" className="px-1">
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
