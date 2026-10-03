import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import type {
  CameraRef,
  CircleLayerSpecification,
  FillLayerSpecification,
  GeoJSONSourceRef,
  LineLayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from "@maplibre/maplibre-react-native";
import { POLAND_BOUNDS } from "@wartownik/shared/config/constants";
import { REGION_STATUS_VISUALS } from "@wartownik/shared/regions";
import type { RegionState } from "@wartownik/shared/regions";
import type {
  LayerClusterWithLayer,
  LayerPoint,
} from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
import type { Feature, Point } from "geojson";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";

import { useBaseStyle } from "@/hooks/use-base-style";
import type { MapViewport } from "@/hooks/use-live-data";
import {
  COUNTRY_COLORS,
  buildPointCollections,
  regionsWithStatus,
} from "@/lib/map-data";
import type { PointFeatureProps } from "@/lib/map-data";
import { colors } from "@/lib/theme";

export interface MapCanvasHandle {
  flyTo(center: Coordinates, zoom?: number): void;
  fitPoland(): void;
}

interface MapCanvasProps {
  points: LayerPoint[];
  clusters: LayerClusterWithLayer[];
  regionStates: RegionState[];
  showUserLocation: boolean;
  onViewportChange(viewport: MapViewport): void;
  onSelectPoint(index: number): void;
  onSelectRegion(regionId: string): void;
}

const expr = (value: unknown) => value as ExpressionSpecification;
const regionStatus = expr(["get", "status"]);
const quiet = expr(["==", regionStatus, "none"]);
const regionColor = expr([
  "match",
  regionStatus,
  "threat",
  REGION_STATUS_VISUALS.threat.color,
  "approaching",
  REGION_STATUS_VISUALS.approaching.color,
  "watch",
  REGION_STATUS_VISUALS.watch.color,
  [
    "match",
    ["get", "country"],
    "UA",
    COUNTRY_COLORS.UA,
    "BY",
    COUNTRY_COLORS.BY,
    "RU",
    COUNTRY_COLORS.RU,
    COUNTRY_COLORS.PL,
  ],
]);

const regionFill: FillLayerSpecification["paint"] = {
  "fill-color": regionColor,
  "fill-opacity": expr([
    "interpolate",
    ["linear"],
    ["zoom"],
    5,
    [
      "match",
      regionStatus,
      "threat",
      0.32,
      "approaching",
      0.24,
      "watch",
      0.15,
      0.05,
    ],
    9.5,
    0,
  ]),
};

const regionLine: LineLayerSpecification["paint"] = {
  "line-color": regionColor,
  "line-opacity": expr(["case", quiet, 0.45, 1]),
  "line-width": expr(["case", quiet, 0.8, 2.2]),
};

const regionLabel: SymbolLayerSpecification["layout"] = {
  "text-field": expr(["upcase", ["get", "label"]]),
  "text-font": ["Noto Sans Regular"],
  "text-size": 10,
  "text-letter-spacing": 0.1,
  "text-max-width": 8,
};

const isCluster = expr([
  "any",
  ["has", "point_count"],
  ["==", ["get", "server"], true],
]);
const clusterTotal = expr(["coalesce", ["get", "total"], ["get", "w"]]);

const clusterCircle: CircleLayerSpecification["paint"] = {
  "circle-color": colors.background,
  "circle-opacity": 0.92,
  "circle-radius": expr([
    "interpolate",
    ["linear"],
    clusterTotal,
    2,
    12,
    100,
    15,
    1000,
    18,
    10000,
    22,
  ]),
  "circle-stroke-width": 2.5,
  "circle-stroke-color": expr(["coalesce", ["get", "color"], colors.primary]),
};

const clusterCount: SymbolLayerSpecification["layout"] = {
  "text-field": expr([
    "case",
    [">=", clusterTotal, 1000],
    ["concat", ["to-string", ["round", ["/", clusterTotal, 1000]]], "k"],
    ["to-string", clusterTotal],
  ]),
  "text-font": ["Noto Sans Bold"],
  "text-size": 11,
  "text-allow-overlap": true,
};

const markerPaint: CircleLayerSpecification["paint"] = {
  "circle-color": expr(["get", "color"]),
  "circle-radius": 9,
  "circle-stroke-width": 2,
  "circle-stroke-color": "#ffffff",
  "circle-opacity": expr(["case", ["get", "dimmed"], 0.55, 1]),
  "circle-stroke-opacity": expr(["case", ["get", "dimmed"], 0.55, 1]),
};

const haloPaint: CircleLayerSpecification["paint"] = {
  "circle-color": expr(["get", "color"]),
  "circle-radius": 18,
  "circle-opacity": 0.25,
};

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      points,
      clusters,
      regionStates,
      showUserLocation,
      onViewportChange,
      onSelectPoint,
      onSelectRegion,
    },
    ref,
  ) {
    const camera = useRef<CameraRef>(null);
    const clusteredSource = useRef<GeoJSONSourceRef>(null);
    const style = useBaseStyle();

    useImperativeHandle(ref, () => ({
      flyTo: ({ lat, lng }, zoom = 13) =>
        camera.current?.flyTo({ center: [lng, lat], zoom, duration: 800 }),
      fitPoland: () =>
        camera.current?.fitBounds(
          [
            POLAND_BOUNDS.west,
            POLAND_BOUNDS.south,
            POLAND_BOUNDS.east,
            POLAND_BOUNDS.north,
          ],
          {
            padding: { top: 40, right: 24, bottom: 40, left: 24 },
            duration: 600,
          },
        ),
    }));

    const regions = useMemo(
      () => regionsWithStatus(regionStates),
      [regionStates],
    );
    const { clustered, live } = useMemo(
      () => buildPointCollections(points, clusters),
      [points, clusters],
    );

    const handlePointPress = async (feature: Feature | undefined) => {
      if (feature === undefined || feature.geometry.type !== "Point") {
        return;
      }
      const props = feature.properties as Partial<PointFeatureProps> & {
        cluster_id?: number;
      };
      const [lng, lat] = (feature.geometry as Point).coordinates;
      if (typeof props.cluster_id === "number") {
        const zoom = await clusteredSource.current?.getClusterExpansionZoom(
          props.cluster_id,
        );
        camera.current?.easeTo({
          center: [lng, lat],
          zoom: zoom ?? 12,
          duration: 400,
        });
        return;
      }
      if (props.server === true) {
        camera.current?.easeTo({ center: [lng, lat], zoom: 12, duration: 400 });
        return;
      }
      if (typeof props.i === "number" && props.i >= 0) {
        onSelectPoint(props.i);
      }
    };

    return (
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={style as unknown as StyleSpecification}
        attributionPosition={{ bottom: 8, right: 8 }}
        logo={false}
        compass={false}
        onRegionDidChange={({ nativeEvent }) => {
          const [west, south, east, north] = nativeEvent.bounds;
          onViewportChange({
            west,
            south,
            east,
            north,
            zoom: nativeEvent.zoom,
          });
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{
            bounds: [
              POLAND_BOUNDS.west,
              POLAND_BOUNDS.south,
              POLAND_BOUNDS.east,
              POLAND_BOUNDS.north,
            ],
          }}
        />

        <GeoJSONSource
          id="regions"
          data={regions}
          onPress={({ nativeEvent }) => {
            const id = nativeEvent.features[0]?.properties?.id;
            if (typeof id === "string") {
              onSelectRegion(id);
            }
          }}
        >
          <Layer type="fill" id="regions-fill" paint={regionFill} />
          <Layer type="line" id="regions-line" paint={regionLine} />
          <Layer
            type="symbol"
            id="regions-label"
            minzoom={4.5}
            maxzoom={9}
            layout={regionLabel}
            paint={{
              "text-color": "rgba(203,213,225,0.7)",
              "text-halo-color": "rgba(2,6,23,0.8)",
              "text-halo-width": 1.2,
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource
          id="clustered"
          ref={clusteredSource}
          data={clustered}
          cluster
          clusterRadius={46}
          clusterMaxZoom={13}
          onPress={({ nativeEvent }) =>
            void handlePointPress(nativeEvent.features[0])
          }
        >
          <Layer
            type="circle"
            id="clusters"
            filter={isCluster}
            paint={clusterCircle}
          />
          <Layer
            type="symbol"
            id="clusters-count"
            filter={isCluster}
            layout={clusterCount}
            paint={{ "text-color": colors.text }}
          />
          <Layer
            type="circle"
            id="clustered-markers"
            filter={expr(["!", isCluster])}
            paint={markerPaint}
          />
        </GeoJSONSource>

        <GeoJSONSource
          id="live"
          data={live}
          onPress={({ nativeEvent }) =>
            void handlePointPress(nativeEvent.features[0])
          }
        >
          <Layer
            type="circle"
            id="live-halo"
            filter={expr(["==", ["get", "pulse"], true])}
            paint={haloPaint}
          />
          <Layer type="circle" id="live-markers" paint={markerPaint} />
        </GeoJSONSource>

        {showUserLocation ? <UserLocation heading /> : null}
      </MapLibreMap>
    );
  },
);
