"use client";

import type { Feature, FeatureCollection, Point } from "geojson";
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
  Source,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";

import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/config/constants";
import { useMap } from "@/hooks/use-map";
import { buildMapFeatures } from "@/lib/map/features";
import { addMissingImage } from "@/lib/map/images";
import {
  CLUSTER_PROPERTIES,
  MAP_STYLES,
  arrowSymbol,
  clusterCircle,
  clusterCount,
  clusterGlow,
  firesHeatmap,
  markerSymbol,
  polandGlow,
  polandOutline,
  pulseCircle,
  regionFill,
  regionHoverFill,
  regionLabel,
  regionLine,
  selectionRing,
  smogHalo,
  userDot,
  userHalo,
  zoneFill,
  zoneOutline,
} from "@/lib/map/styles";
import { configureMapLibreWorker } from "@/lib/map/worker";
import type { RegionCollection } from "@/lib/regions";
import type { LayerClusterWithLayer, LayerPoint } from "@/types/layers";

configureMapLibreWorker();

const INTERACTIVE_LAYERS = [
  "live-markers",
  "fires-markers",
  "clustered-markers",
  "clusters",
  "regions-fill",
];

const PULSE_PERIOD_MS = 1600;

interface MapCanvasProps {
  points: LayerPoint[];
  keys: string[];
  clusters: LayerClusterWithLayer[];
  regions: RegionCollection | null;
  selectedKey: string | null;
  hoveredRegionId: string | null;
  onSelectPoint(index: number): void;
  onSelectRegion(regionId: string): void;
  onHoverRegion(regionId: string | null): void;
}

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}

export function MapCanvas({
  points,
  keys,
  clusters,
  regions,
  selectedKey,
  hoveredRegionId,
  onSelectPoint,
  onSelectRegion,
  onHoverRegion,
}: MapCanvasProps) {
  const { registerMap, setViewport, userLocation, locateUser } = useMap();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  const mapRef = useRef<MapRef | null>(null);
  const setMapRef = useCallback((instance: MapRef | null) => {
    mapRef.current = instance;
    const map = instance?.getMap();
    map?.setMissingStyleImageResolver((id) => addMissingImage(map, id));
  }, []);
  const [labelLayerId, setLabelLayerId] = useState<string | undefined>();
  const [cursor, setCursor] = useState("");
  const [initialView] = useState(() => ({
    longitude: DEFAULT_CENTER.lng,
    latitude: DEFAULT_CENTER.lat,
    zoom: DEFAULT_ZOOM,
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
    registerMap({
      flyTo: (options) => map.flyTo({ ...options, essential: true }),
      fitBounds: (bounds, options) => map.fitBounds(bounds, options),
      zoomBy: (delta) => map.easeTo({ zoom: map.getZoom() + delta }),
    });
    setLabelLayerId(firstSymbolLayerId(map));
    reportViewport(map);
    void locateUser();
  }, [registerMap, reportViewport, locateUser]);

  useEffect(() => () => registerMap(null), [registerMap]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map === undefined) {
      return;
    }
    const onStyle = () => setLabelLayerId(firstSymbolLayerId(map));
    map.on("style.load", onStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  });

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
  }, [hasPulse]);

  const handleClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const map = mapRef.current?.getMap();
      if (feature === undefined || map === undefined) {
        return;
      }
      const properties = feature.properties as Record<string, unknown>;
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
    [onSelectPoint, onSelectRegion],
  );

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const isRegion = feature?.layer.id === "regions-fill";
      setCursor(feature === undefined ? "" : "pointer");
      onHoverRegion(
        isRegion ? String((feature.properties as { id: string }).id) : null,
      );
    },
    [onHoverRegion],
  );

  const hoveredRegion = useMemo<FeatureCollection | null>(() => {
    const feature = regions?.features.find(
      (region) => region.properties.id === hoveredRegionId,
    );
    return feature === undefined
      ? null
      : { type: "FeatureCollection", features: [feature as Feature] };
  }, [regions, hoveredRegionId]);

  return (
    <MapGL
      ref={setMapRef}
      initialViewState={initialView}
      mapStyle={dark ? MAP_STYLES.dark : MAP_STYLES.light}
      style={{ position: "absolute", inset: 0 }}
      minZoom={3}
      maxZoom={18}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      attributionControl={false}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      cursor={cursor}
      onLoad={handleLoad}
      onMoveEnd={(event) => reportViewport(event.target)}
      onClick={(event) => void handleClick(event)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setCursor("");
        onHoverRegion(null);
      }}
    >
      <AttributionControl compact position="bottom-right" />

      {regions === null ? null : (
        <Source id="regions" type="geojson" data={regions}>
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
          <Layer id="regions-label" {...regionLabel(dark)} />
        </Source>
      )}
      {hoveredRegion === null ? null : (
        <Source id="region-hover" type="geojson" data={hoveredRegion}>
          <Layer
            id="region-hover-fill"
            beforeId={labelLayerId}
            {...regionHoverFill}
          />
        </Source>
      )}
      <Source id="poland" type="geojson" data="/geo/poland.json">
        <Layer id="poland-glow" beforeId={labelLayerId} {...polandGlow(dark)} />
        <Layer
          id="poland-line"
          beforeId={labelLayerId}
          {...polandOutline(dark)}
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

      <Source id="selection" type="geojson" data={selection}>
        <Layer id="selection-ring" {...selectionRing} />
      </Source>

      <Source id="live" type="geojson" data={features.live}>
        <Layer id="live-pulse" {...pulseCircle} />
        <Layer id="live-arrows" {...arrowSymbol} />
        <Layer id="live-markers" {...markerSymbol()} />
      </Source>

      <Source id="user" type="geojson" data={userFeature}>
        <Layer id="user-halo" {...userHalo} />
        <Layer id="user-dot" {...userDot} />
      </Source>
    </MapGL>
  );
}
