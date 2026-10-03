"use client";

import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useState } from "react";
import MapGL, { Marker } from "react-map-gl/maplibre";

import { useMap } from "@/hooks/use-map";
import { MAP_STYLES } from "@/lib/map/styles";
import { configureMapLibreWorker } from "@/lib/map/worker";
import type { Coordinates } from "@/types/map";

configureMapLibreWorker();

const PICKER_MIN_ZOOM = 11;

export function LocationPicker({
  value,
  onChange,
}: {
  value: Coordinates | null;
  onChange(location: Coordinates): void;
}) {
  const { center, zoom, userLocation } = useMap();
  const { resolvedTheme } = useTheme();
  const [initialView] = useState(() => {
    const start = value ?? userLocation ?? center;
    return {
      longitude: start.lng,
      latitude: start.lat,
      zoom: Math.max(zoom, PICKER_MIN_ZOOM),
    };
  });

  return (
    <MapGL
      initialViewState={initialView}
      mapStyle={resolvedTheme === "light" ? MAP_STYLES.light : MAP_STYLES.dark}
      style={{ width: "100%", height: "100%" }}
      dragRotate={false}
      attributionControl={false}
      cursor="crosshair"
      onClick={(event) =>
        onChange({ lat: event.lngLat.lat, lng: event.lngLat.lng })
      }
    >
      {value === null ? null : (
        <Marker longitude={value.lng} latitude={value.lat} anchor="bottom">
          <MapPin
            className="size-9 fill-red-600 text-white drop-shadow-lg"
            strokeWidth={1.5}
          />
        </Marker>
      )}
    </MapGL>
  );
}
