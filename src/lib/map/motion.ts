import { PREDICTION_LIMITS } from "@/config/threats";
import { destinationPoint } from "@/lib/helpers/geo";
import { Layer } from "@/types/layers";
import type { LayerPoint } from "@/types/layers";
import type { Coordinates } from "@/types/map";

const KNOTS_TO_KMH = 1.852;
const AIRCRAFT_MAX_EXTRAPOLATION_S = 90;

export type MotionModel = (now: number) => Coordinates;

export function motionModel(
  point: LayerPoint,
  receivedAt: number,
): MotionModel | null {
  if (point.layer === Layer.Aircraft) {
    const { speedKt, heading, onGround, seenSeconds } = point.meta;
    if (onGround || speedKt === null || speedKt <= 0 || heading === null) {
      return null;
    }
    const speedKmh = speedKt * KNOTS_TO_KMH;
    return (now) => {
      const seconds = Math.min(
        seenSeconds + (now - receivedAt) / 1000,
        AIRCRAFT_MAX_EXTRAPOLATION_S,
      );
      return destinationPoint(point, heading, (speedKmh * seconds) / 3600);
    };
  }

  if (point.layer === Layer.Drones) {
    const { speedKmh, heading, stale, advisory, confirmedAt, type } =
      point.meta;
    if (
      stale ||
      advisory ||
      speedKmh === null ||
      speedKmh <= 0 ||
      heading === null
    ) {
      return null;
    }
    const limits = PREDICTION_LIMITS[type];
    const confirmed =
      confirmedAt === null ? receivedAt : Date.parse(confirmedAt);
    const elapsedAtReceive = Math.max(0, (receivedAt - confirmed) / 1000);
    const remainingSeconds = Math.max(
      0,
      limits.maxMinutes * 60 - elapsedAtReceive,
    );
    const travelledKm =
      (speedKmh * Math.min(elapsedAtReceive, limits.maxMinutes * 60)) / 3600;
    const remainingKm = Math.max(0, limits.maxKm - travelledKm);
    if (remainingSeconds === 0 || remainingKm === 0) {
      return null;
    }
    return (now) => {
      const seconds = Math.min((now - receivedAt) / 1000, remainingSeconds);
      const distanceKm = Math.min((speedKmh * seconds) / 3600, remainingKm);
      return distanceKm <= 0
        ? point
        : destinationPoint(point, heading, distanceKm);
    };
  }

  return null;
}
