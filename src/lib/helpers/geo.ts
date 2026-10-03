import { EARTH_RADIUS_KM, TILE_SIZE_PX } from "@/config/constants";
import type { Bounds, Coordinates } from "@/types/map";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function getClosestPoints<T extends Coordinates>(
  target: Coordinates,
  points: T[],
  count = 20,
): (T & { distance: number })[] {
  return points
    .map((point) => ({ ...point, distance: haversineDistance(target, point) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

export function destinationPoint(
  point: Coordinates,
  bearingDeg: number,
  distanceKm: number,
): Coordinates {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(point.lat);
  const lng1 = toRadians(point.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: toDegrees(lat2),
    lng: ((toDegrees(lng2) + 540) % 360) - 180,
  };
}

export function isInBounds({ lat, lng }: Coordinates, { nw, se }: Bounds) {
  return lat <= nw.lat && lat >= se.lat && lng >= nw.lng && lng <= se.lng;
}

export function degreesPerPixel(zoom: number): number {
  return 360 / (TILE_SIZE_PX * 2 ** zoom);
}

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

export function snapBoundsToTiles(bounds: Bounds, zoom: number): Bounds {
  const step = degreesPerPixel(zoom) * TILE_SIZE_PX;
  const up = (value: number) => Math.ceil(value / step) * step;
  const down = (value: number) => Math.floor(value / step) * step;
  return {
    nw: {
      lat: clamp(up(bounds.nw.lat), 90),
      lng: clamp(down(bounds.nw.lng), 180),
    },
    se: {
      lat: clamp(down(bounds.se.lat), 90),
      lng: clamp(up(bounds.se.lng), 180),
    },
  };
}
