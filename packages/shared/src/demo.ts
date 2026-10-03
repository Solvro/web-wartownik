import { destinationPoint } from "./geo/geo";
import type { Layer, LayerLocation } from "./types/layers";

const LOOP_SECONDS = 240;
const ROUTE_KM = 190;
const SPEED_KMH = 150;
const HEADING = 268;
const PREDICTION_KM = 18;
const STARTS = [
  { lat: 51.24, lng: 25.75 },
  { lat: 51.12, lng: 25.82 },
  { lat: 51.33, lng: 25.9 },
];

export function demoThreats(now: number): LayerLocation<Layer.Drones>[] {
  const progress = ((now / 1000) % LOOP_SECONDS) / LOOP_SECONDS;
  const updatedAt = new Date(now).toISOString();
  return STARTS.map((start, index) => {
    const position = destinationPoint(start, HEADING, progress * ROUTE_KM);
    return {
      ...position,
      meta: {
        id: `demo-${index}`,
        type: "uav",
        region: "Obwód wołyński",
        locality: null,
        heading: HEADING,
        speedKmh: SPEED_KMH,
        confidence: "medium",
        sourceCount: 2,
        groupSize: null,
        advisory: false,
        stale: false,
        updatedAt,
        uncertaintyKm: 8,
        predictedPath: destinationPoint(position, HEADING, PREDICTION_KM),
        confirmedAt: updatedAt,
        demo: true,
      },
    };
  });
}
