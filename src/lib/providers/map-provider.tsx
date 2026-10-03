"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/config/constants";
import { enabledLayersStore } from "@/lib/enabled-layers-store";
import type { EnabledLayers, Layer } from "@/types/layers";
import type { Bounds, Coordinates, Viewport } from "@/types/map";

export interface MapHandle {
  flyTo(options: { center: [number, number]; zoom?: number }): void;
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: { padding?: number; maxZoom?: number },
  ): void;
  zoomBy(delta: number): void;
}

export interface MapContextValue {
  enabledLayers: EnabledLayers;
  toggleLayer(layer: Layer): void;
  center: Coordinates;
  zoom: number;
  viewport: Viewport | null;
  setViewport(viewport: Viewport): void;
  registerMap(map: MapHandle | null): void;
  flyTo(center: Coordinates, zoom?: number): void;
  fitBounds(bounds: Bounds): void;
  zoomBy(delta: number): void;
  userLocation: Coordinates | null;
  isLocating: boolean;
  locateUser(): Promise<Coordinates | null>;
}

export const MapContext = createContext<MapContextValue | null>(null);

type CameraTarget =
  | { kind: "fly"; center: Coordinates; zoom?: number }
  | { kind: "fit"; bounds: Bounds };

function moveCamera(map: MapHandle, target: CameraTarget) {
  if (target.kind === "fly") {
    map.flyTo({
      center: [target.center.lng, target.center.lat],
      zoom: target.zoom,
    });
    return;
  }
  const { nw, se } = target.bounds;
  map.fitBounds(
    [
      [nw.lng, se.lat],
      [se.lng, nw.lat],
    ],
    { padding: 60, maxZoom: 15 },
  );
}

function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation is not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60_000 },
    );
  });
}

export function MapContextProvider({ children }: { children: ReactNode }) {
  const enabledLayers = useSyncExternalStore(
    enabledLayersStore.subscribe,
    enabledLayersStore.getSnapshot,
    enabledLayersStore.getServerSnapshot,
  );
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<MapHandle | null>(null);
  const pendingTarget = useRef<CameraTarget | null>(null);

  const toggleLayer = useCallback((layer: Layer) => {
    const current = enabledLayersStore.getSnapshot();
    enabledLayersStore.set({ ...current, [layer]: !current[layer] });
  }, []);

  const registerMap = useCallback((map: MapHandle | null) => {
    mapRef.current = map;
    if (map !== null && pendingTarget.current !== null) {
      moveCamera(map, pendingTarget.current);
      pendingTarget.current = null;
    }
  }, []);

  const move = useCallback((target: CameraTarget) => {
    if (mapRef.current === null) {
      pendingTarget.current = target;
      return;
    }
    moveCamera(mapRef.current, target);
  }, []);

  const flyTo = useCallback(
    (center: Coordinates, zoom?: number) => move({ kind: "fly", center, zoom }),
    [move],
  );

  const fitBounds = useCallback(
    (bounds: Bounds) => move({ kind: "fit", bounds }),
    [move],
  );

  const zoomBy = useCallback((delta: number) => {
    mapRef.current?.zoomBy(delta);
  }, []);

  const locateUser = useCallback(async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentPosition();
      setUserLocation(location);
      flyTo(location, 13);
      return location;
    } catch {
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [flyTo]);

  const value = useMemo<MapContextValue>(
    () => ({
      enabledLayers,
      toggleLayer,
      center: viewport?.center ?? DEFAULT_CENTER,
      zoom: viewport?.zoom ?? DEFAULT_ZOOM,
      viewport,
      setViewport,
      registerMap,
      flyTo,
      fitBounds,
      zoomBy,
      userLocation,
      isLocating,
      locateUser,
    }),
    [
      enabledLayers,
      toggleLayer,
      viewport,
      registerMap,
      flyTo,
      fitBounds,
      zoomBy,
      userLocation,
      isLocating,
      locateUser,
    ],
  );

  return <MapContext value={value}>{children}</MapContext>;
}
