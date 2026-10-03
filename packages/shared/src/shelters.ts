import type { ShelterAvailability } from "./config/shelters";
import { haversineDistance } from "./geo/geo";
import type { Layer, LayerLocation } from "./types/layers";
import type { Coordinates } from "./types/map";

export const WALKING_SPEED_KMH = 5;

export const ACCESS_DELAY_MINUTES: Record<ShelterAvailability, number> = {
  always: 0,
  scheduled: 5,
  on_demand: 10,
};

export interface RankedShelter {
  shelter: LayerLocation<Layer.Shelters>;
  distanceKm: number;
  walkMinutes: number;
  safetyMinutes: number;
}

export function rankShelters(
  origin: Coordinates,
  shelters: LayerLocation<Layer.Shelters>[],
  limit = 5,
): RankedShelter[] {
  return shelters
    .map((shelter) => {
      const distanceKm = haversineDistance(origin, shelter);
      const walkMinutes = (distanceKm / WALKING_SPEED_KMH) * 60;
      return {
        shelter,
        distanceKm,
        walkMinutes,
        safetyMinutes:
          walkMinutes + ACCESS_DELAY_MINUTES[shelter.meta.availability],
      };
    })
    .sort((a, b) => a.safetyMinutes - b.safetyMinutes)
    .slice(0, limit);
}
