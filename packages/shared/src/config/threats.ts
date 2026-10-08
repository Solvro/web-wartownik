import type { ThreatType } from "../types/layers";

export const PREDICTION_LIMITS: Record<
  ThreatType,
  { maxMinutes: number; maxKm: number }
> = {
  uav: { maxMinutes: 12, maxKm: 18 },
  recon: { maxMinutes: 12, maxKm: 12 },
  fpv: { maxMinutes: 10, maxKm: 10 },
  missile: { maxMinutes: 5, maxKm: 30 },
  kab: { maxMinutes: 4, maxKm: 10 },
  ballistic: { maxMinutes: 1.5, maxKm: 20 },
  mig31k: { maxMinutes: 6, maxKm: 24 },
  unknown: { maxMinutes: 6, maxKm: 10 },
};

export const COURSE_LIMITS: Record<
  ThreatType,
  { alertKm: number; watchKm: number; cruiseKmh: number }
> = {
  uav: { alertKm: 80, watchKm: 150, cruiseKmh: 150 },
  recon: { alertKm: 60, watchKm: 120, cruiseKmh: 120 },
  fpv: { alertKm: 15, watchKm: 30, cruiseKmh: 100 },
  missile: { alertKm: 250, watchKm: 400, cruiseKmh: 750 },
  kab: { alertKm: 40, watchKm: 70, cruiseKmh: 400 },
  ballistic: { alertKm: 400, watchKm: 600, cruiseKmh: 3000 },
  mig31k: { alertKm: 0, watchKm: 0, cruiseKmh: 0 },
  unknown: { alertKm: 50, watchKm: 100, cruiseKmh: 150 },
};
