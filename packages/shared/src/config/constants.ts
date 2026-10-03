import type { Coordinates } from "../types/map";

export const POLAND_BOUNDS = {
  west: 14,
  south: 49,
  east: 24.2,
  north: 54.9,
} as const;

export const POLAND_CENTER: Coordinates = { lat: 51.95, lng: 19.1 };
export const DEFAULT_CENTER: Coordinates = { lat: 52.0, lng: 19.3 };
export const DEFAULT_ZOOM = 5.4;

export const SERVER_CLUSTERING_MAX_ZOOM = 13;
export const CLUSTER_RADIUS_PX = 60;
export const TILE_SIZE_PX = 256;
export const EARTH_RADIUS_KM = 6371;
export const MAX_DB_POINTS = 5000;

export const ENABLED_LAYERS_COOKIE = "wartownik_enabled_layers";
export const VIEWPORT_DEBOUNCE_MS = 250;

export const MAPLIBRE_TO_WEB_ZOOM_OFFSET = 1;
export const REGION_WATCH_DISTANCE_KM = 50;
