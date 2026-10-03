"use client";

import type { Coordinates } from "@defensownik/shared/types/map";
import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useState } from "react";
import MapGL, { Marker } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";

import { useBaseStyle } from "@/hooks/use-base-style";
import { useMap } from "@/hooks/use-map";
import { addMissingImage } from "@/lib/map/images";
import { configureMapLibreWorker } from "@/lib/map/worker";

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
  const baseStyle = useBaseStyle(resolvedTheme !== "light");
  const [initialView] = useState(() => {
    const start = value ?? userLocation ?? center;
    return {
      longitude: start.lng,
      latitude: start.lat,
      zoom: Math.max(zoom, PICKER_MIN_ZOOM),
    };
  });

  if (baseStyle === undefined) {
    return <div className="size-full animate-pulse bg-muted" />;
  }

  return (
    <MapGL
      ref={(instance: MapRef | null) => {
        const map = instance?.getMap();
        map?.setMissingStyleImageResolver((id) => addMissingImage(map, id));
      }}
      initialViewState={initialView}
      mapStyle={baseStyle}
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
