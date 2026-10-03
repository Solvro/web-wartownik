import type { ThreatType } from "@/types/layers";

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
