"use client";

import { POLAND_BOUNDS } from "@wartownik/shared/config/constants";
import type { RegionCollection, RegionStatus } from "@wartownik/shared/regions";
import type {
  LayerClusterWithLayer,
  LayerPoint,
} from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
import type { UkraineAlerts } from "@wartownik/shared/types/ukraine-alerts";
import type { FeatureCollection, Point } from "geojson";
import { MapPin } from "lucide-react";
import type {
  GeoJSONSource,
  MapLayerMouseEvent,
  Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  AttributionControl,
  Layer,
  Marker,
  Source,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";

import { GEO_URLS } from "@/config/geo";
import { useBaseStyle } from "@/hooks/use-base-style";
import { useMap } from "@/hooks/use-map";
import { buildMapFeatures } from "@/lib/map/features";
import { addMissingImage } from "@/lib/map/images";
import {
  CLUSTER_PROPERTIES,
  arrowSymbol,
  clusterCircle,
  clusterCount,
  clusterGlow,
  countryGlow,
  countryOutline,
  firesHeatmap,
  historyCasing,
  historyLine,
  historyPoints,
  markerSymbol,
  pulseCircle,
  regionFill,
  regionHoverFill,
  regionLabel,
  regionLine,
  selectionRing,
  smogHalo,
  ukraineAlertFill,
  ukraineAlertLine,
  userDot,
  userHalo,
  zoneFill,
  zoneOutline,
} from "@/lib/map/styles";
import { configureMapLibreWorker } from "@/lib/map/worker";
import type { MapHandle } from "@/lib/providers/map-provider";

import { useLiveAnimation } from "./use-live-animation";

configureMapLibreWorker();

const INTERACTIVE_LAYERS = [
  "live-markers",
  "fires-markers",
  "clustered-markers",
  "clusters",
  "ukraine-raions-fill",
  "regions-fill",
];

const PULSE_PERIOD_MS = 1600;

interface MapCanvasProps {
  sidePadding: number;
  history: Coordinates[];
  historyColor?: string;
  historyMarkers: boolean;
  searchMarker: Coordinates | null;
  points: LayerPoint[];
  keys: string[];
  clusters: LayerClusterWithLayer[];
  regions: RegionCollection | null;
  selectedKey: string | null;
  regionStatuses: Record<string, RegionStatus>;
  ukraineAlerts: UkraineAlerts | null;
  onSelectUkraineAlert(raionId: string): void;
  onSelectPoint(index: number): void;
  onSelectRegion(regionId: string): void;
}

function createMapHandle(map: MapLibreMap): MapHandle {
  return {
    flyTo: (options) => map.flyTo({ ...options, essential: true }),
    fitBounds: (bounds, options) => map.fitBounds(bounds, options),
    zoomBy: (delta) => map.easeTo({ zoom: map.getZoom() + delta }),
  };
}

export function MapCanvas({
  sidePadding,
  history,
  historyColor,
  historyMarkers,
  searchMarker,
  points,
  keys,
  clusters,
  regions,
  selectedKey,
  regionStatuses,
  ukraineAlerts,
  onSelectUkraineAlert,
  onSelectPoint,
  onSelectRegion,
}: MapCanvasProps) {
  const { registerMap, setViewport, userLocation, locateUser } = useMap();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const setMapRef = useCallback((instance: MapRef | null) => {
    mapRef.current = instance;
    if (instance === null) {
      setMapReady(false);
    }
    const map = instance?.getMap();
    map?.setMissingStyleImageResolver((id) => addMissingImage(map, id));
  }, []);
  const baseStyle = useBaseStyle(dark);
  const labelLayerId = useMemo(
    () => baseStyle?.layers.find((layer) => layer.type === "symbol")?.id,
    [baseStyle],
  );
  const hoveredRegionRef = useRef<string | null>(null);
  const regionStatusesRef = useRef(regionStatuses);
  const ukraineAlertsRef = useRef(ukraineAlerts);
  const [initialView] = useState(() => ({
    bounds: [
      [POLAND_BOUNDS.west, POLAND_BOUNDS.south],
      [POLAND_BOUNDS.east, POLAND_BOUNDS.north],
    ] as [[number, number], [number, number]],
    fitBoundsOptions: {
      padding: { top: 24, right: 24, bottom: 24, left: sidePadding + 24 },
    },
  }));

  const features = useMemo(
    () => buildMapFeatures(points, keys, clusters),
    [points, keys, clusters],
  );

  const selection = useMemo<FeatureCollection<Point>>(() => {
    const index = selectedKey === null ? -1 : keys.indexOf(selectedKey);
    const point = index === -1 ? undefined : points[index];
    return {
      type: "FeatureCollection",
      features:
        point === undefined
          ? []
          : [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [point.lng, point.lat],
                },
                properties: {},
              },
            ],
    };
  }, [selectedKey, keys, points]);

  const historyFeature = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features:
        history.length < 2
          ? []
          : [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: history.map(({ lng, lat }) => [lng, lat]),
                },
                properties: {},
              },
              ...(historyMarkers
                ? history.map(({ lng, lat }) => ({
                    type: "Feature" as const,
                    geometry: {
                      type: "Point" as const,
                      coordinates: [lng, lat],
                    },
                    properties: {},
                  }))
                : []),
            ],
    }),
    [history, historyMarkers],
  );

  const userFeature = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features:
        userLocation === null
          ? []
          : [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [userLocation.lng, userLocation.lat],
                },
                properties: {},
              },
            ],
    }),
    [userLocation],
  );

  const reportViewport = useCallback(
    (map: MapLibreMap) => {
      const bounds = map.getBounds();
      const center = map.getCenter();
      setViewport({
        zoom: map.getZoom(),
        center: { lat: center.lat, lng: center.lng },
        bounds: {
          nw: { lat: bounds.getNorth(), lng: bounds.getWest() },
          se: { lat: bounds.getSouth(), lng: bounds.getEast() },
        },
      });
    },
    [setViewport],
  );

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map === undefined) {
      return;
    }
    registerMap(createMapHandle(map));
    setMapReady(true);
    map.setPadding({ top: 0, right: 0, bottom: 0, left: sidePadding });
    map.fitBounds(
      [
        [POLAND_BOUNDS.west, POLAND_BOUNDS.south],
        [POLAND_BOUNDS.east, POLAND_BOUNDS.north],
      ],
      { padding: 24, animate: false },
    );
    reportViewport(map);
    void locateUser();
  }, [registerMap, reportViewport, locateUser, sidePadding]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map !== undefined) {
      registerMap(createMapHandle(map));
    }
    return () => registerMap(null);
  }, [registerMap]);

  useEffect(() => {
    mapRef.current?.getMap().easeTo({
      padding: { top: 0, right: 0, bottom: 0, left: sidePadding },
      duration: 300,
    });
  }, [sidePadding]);

  useLiveAnimation(mapRef, mapReady, features, points, keys, selectedKey);

  const hasPulse = features.live.features.some(
    (feature) => feature.properties.pulse,
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map === undefined || !hasPulse) {
      return;
    }
    let frame = 0;
    const animate = (time: number) => {
      const phase = (time % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      if (map.getLayer("live-pulse") !== undefined) {
        map.setPaintProperty("live-pulse", "circle-radius", 15 + phase * 16);
        map.setPaintProperty(
          "live-pulse",
          "circle-opacity",
          0.45 * (1 - phase),
        );
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [hasPulse, mapReady]);

  const handleClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const features = event.features ?? [];
      const alertedRaions = new Set(
        (ukraineAlertsRef.current?.raions ?? []).map((alert) => alert.raionId),
      );
      const feature =
        features.find(
          (item) =>
            item.layer.id !== "regions-fill" &&
            item.layer.id !== "ukraine-raions-fill",
        ) ??
        features.find(
          (item) =>
            item.layer.id === "ukraine-raions-fill" &&
            alertedRaions.has(String((item.properties as { id: string }).id)),
        ) ??
        features.find((item) => item.layer.id === "regions-fill");
      const map = mapRef.current?.getMap();
      if (feature === undefined || map === undefined) {
        return;
      }
      const properties = feature.properties as Record<string, unknown>;
      if (feature.layer.id === "ukraine-raions-fill") {
        onSelectUkraineAlert(String(properties.id));
        return;
      }
      const [lng, lat] = (feature.geometry as Point).coordinates;

      if (feature.layer.id === "regions-fill") {
        onSelectRegion(String(properties.id));
        return;
      }
      if (feature.layer.id === "clusters") {
        if (typeof properties.cluster_id === "number") {
          const source = map.getSource<GeoJSONSource>("clustered");
          const zoom = await source?.getClusterExpansionZoom(
            properties.cluster_id,
          );
          map.easeTo({ center: [lng, lat], zoom: Math.min(zoom ?? 14, 18) });
        } else {
          map.easeTo({ center: [lng, lat], zoom: map.getZoom() + 2 });
        }
        return;
      }
      if (typeof properties.i === "number") {
        onSelectPoint(properties.i);
      }
    },
    [onSelectPoint, onSelectRegion, onSelectUkraineAlert],
  );

  const setHoveredRegion = useCallback((regionId: string | null) => {
    const map = mapRef.current?.getMap();
    const previous = hoveredRegionRef.current;
    if (map === undefined || previous === regionId) {
      return;
    }
    if (map.getSource("regions") !== undefined) {
      if (previous !== null) {
        map.setFeatureState(
          { source: "regions", id: previous },
          { hover: false },
        );
      }
      if (regionId !== null) {
        map.setFeatureState(
          { source: "regions", id: regionId },
          { hover: true },
        );
      }
    }
    hoveredRegionRef.current = regionId;
  }, []);

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      event.target.getCanvas().style.cursor =
        feature === undefined ? "" : "pointer";
      setHoveredRegion(
        feature?.layer.id === "regions-fill"
          ? String((feature.properties as { id: string }).id)
          : null,
      );
    },
    [setHoveredRegion],
  );

  const applyRegionStatuses = useCallback((map: MapLibreMap) => {
    const alerts = ukraineAlertsRef.current;
    if (map.getSource("regions") !== undefined) {
      const oblastAlerts = new Map(
        (alerts?.oblasts ?? []).map((alert) => [alert.oblastId, alert.level]),
      );
      for (const [id, status] of Object.entries(regionStatusesRef.current)) {
        map.setFeatureState(
          { source: "regions", id },
          { status, uaAlert: oblastAlerts.get(id) ?? null },
        );
      }
    }
    if (map.getSource("ukraine-raions") !== undefined) {
      map.removeFeatureState({ source: "ukraine-raions" });
      for (const alert of alerts?.raions ?? []) {
        map.setFeatureState(
          { source: "ukraine-raions", id: alert.raionId },
          { alert: alert.level },
        );
      }
    }
  }, []);

  useEffect(() => {
    regionStatusesRef.current = regionStatuses;
    ukraineAlertsRef.current = ukraineAlerts;
    const map = mapRef.current?.getMap();
    if (map !== undefined) {
      applyRegionStatuses(map);
    }
  }, [regionStatuses, ukraineAlerts, applyRegionStatuses, mapReady]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map === undefined) {
      return;
    }
    const onSourceData = (event: {
      sourceId?: string;
      isSourceLoaded?: boolean;
    }) => {
      if (
        (event.sourceId === "regions" || event.sourceId === "ukraine-raions") &&
        event.isSourceLoaded === true
      ) {
        applyRegionStatuses(map);
      }
    };
    map.on("sourcedata", onSourceData);
    return () => {
      map.off("sourcedata", onSourceData);
    };
  }, [applyRegionStatuses, regions, mapReady]);

  if (baseStyle === undefined) {
    return <div className="absolute inset-0 animate-pulse bg-muted" />;
  }

  return (
    <MapGL
      ref={setMapRef}
      initialViewState={initialView}
      mapStyle={baseStyle}
      style={{ position: "absolute", inset: 0 }}
      minZoom={3}
      maxZoom={18}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      attributionControl={false}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      onLoad={handleLoad}
      onMoveEnd={(event) => reportViewport(event.target)}
      onClick={(event) => void handleClick(event)}
      onMouseMove={handleMouseMove}
      onMouseLeave={(event) => {
        event.target.getCanvas().style.cursor = "";
        setHoveredRegion(null);
      }}
    >
      <AttributionControl compact position="bottom-right" />

      {regions === null ? null : (
        <Source id="regions" type="geojson" data={regions} promoteId="id">
          <Layer
            id="regions-fill"
            beforeId={labelLayerId}
            {...regionFill(dark)}
          />
          <Layer
            id="regions-line"
            beforeId={labelLayerId}
            {...regionLine(dark)}
          />
          <Layer
            id="regions-hover"
            beforeId={labelLayerId}
            {...regionHoverFill}
          />
          <Layer
            id="regions-ua-alert"
            beforeId={labelLayerId}
            {...ukraineAlertFill("uaAlert")}
          />
        </Source>
      )}
      <Source
        id="ukraine-raions"
        type="geojson"
        data={GEO_URLS.ukraineRaions}
        promoteId="id"
      >
        <Layer
          id="ukraine-raions-fill"
          beforeId={labelLayerId}
          {...ukraineAlertFill("alert")}
        />
        <Layer
          id="ukraine-raions-line"
          beforeId={labelLayerId}
          {...ukraineAlertLine}
        />
      </Source>
      <Source id="region-labels" type="geojson" data={GEO_URLS.regionLabels}>
        <Layer id="regions-label" {...regionLabel(dark)} />
      </Source>
      <Source id="countries" type="geojson" data={GEO_URLS.countries}>
        <Layer
          id="countries-glow"
          beforeId={labelLayerId}
          {...countryGlow(dark)}
        />
        <Layer
          id="countries-line"
          beforeId={labelLayerId}
          {...countryOutline(dark)}
        />
      </Source>

      <Source id="halos" type="geojson" data={features.halos}>
        <Layer id="smog-halo" {...smogHalo} />
      </Source>
      <Source id="zones" type="geojson" data={features.zones}>
        <Layer id="zones-fill" {...zoneFill} />
        <Layer id="zones-line" {...zoneOutline} />
      </Source>
      <Source id="fires" type="geojson" data={features.fires}>
        <Layer id="fires-heat" {...firesHeatmap} />
        <Layer id="fires-markers" minzoom={7.5} {...markerSymbol()} />
      </Source>

      <Source
        id="clustered"
        type="geojson"
        data={features.clustered}
        cluster
        clusterRadius={46}
        clusterMaxZoom={13}
        clusterProperties={CLUSTER_PROPERTIES}
      >
        <Layer id="clusters-glow" {...clusterGlow} />
        <Layer id="clusters" {...clusterCircle(dark)} />
        <Layer id="clusters-count" {...clusterCount(dark)} />
        <Layer
          id="clustered-markers"
          {...markerSymbol([
            "all",
            ["!", ["has", "point_count"]],
            ["!=", ["get", "kind"], "server"],
          ])}
        />
      </Source>

      <Source id="history" type="geojson" data={historyFeature} lineMetrics>
        <Layer id="history-casing" {...historyCasing(dark)} />
        <Layer
          id="history-line"
          filter={["==", ["geometry-type"], "LineString"]}
          {...historyLine(historyColor)}
        />
        <Layer id="history-points" {...historyPoints(historyColor)} />
      </Source>

      <Source id="selection" type="geojson" data={selection}>
        <Layer id="selection-ring" {...selectionRing} />
      </Source>

      <Source id="live" type="geojson" data={features.live}>
        <Layer id="live-pulse" {...pulseCircle} />
        <Layer id="live-arrows" {...arrowSymbol} />
        <Layer id="live-markers" {...markerSymbol()} />
      </Source>

      {searchMarker === null ? null : (
        <Marker
          longitude={searchMarker.lng}
          latitude={searchMarker.lat}
          anchor="bottom"
        >
          <MapPin
            className="size-9 animate-in fill-red-600 text-white drop-shadow-lg zoom-in-50"
            strokeWidth={1.5}
          />
        </Marker>
      )}

      <Source id="user" type="geojson" data={userFeature}>
        <Layer id="user-halo" {...userHalo} />
        <Layer id="user-dot" {...userDot} />
      </Source>
    </MapGL>
  );
}
