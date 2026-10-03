import type { ReportEventType } from "@/config/reports";
import type { ShelterAvailability } from "@/config/shelters";

import type { Coordinates, Viewport } from "./map";

export enum Layer {
  Shelters = "Schrony",
  Drones = "Drony i rakiety",
  Aircraft = "Samoloty wojskowe",
  Smog = "Jakość powietrza",
  Fires = "Pożary",
  Floods = "Poziom wody",
  AEDs = "Defibrylatory (AED)",
  Reports = "Zgłoszenia użytkowników",
}

export const LAYERS = Object.values(Layer);

export interface ShelterMeta {
  id: string;
  address: string | null;
  commune: string | null;
  county: string | null;
  voivodeship: string | null;
  availability: ShelterAvailability;
}

export type ThreatType =
  | "uav"
  | "fpv"
  | "recon"
  | "missile"
  | "ballistic"
  | "kab"
  | "mig31k"
  | "unknown";

export type ThreatConfidence = "low" | "medium" | "high";

export interface DroneMeta {
  id: string;
  type: ThreatType;
  region: string;
  locality: string | null;
  heading: number | null;
  speedKmh: number | null;
  confidence: ThreatConfidence;
  sourceCount: number;
  groupSize: number | null;
  advisory: boolean;
  stale: boolean;
  updatedAt: string;
  uncertaintyKm: number | null;
  predictedPath: Coordinates | null;
  demo?: boolean;
}

export interface AircraftMeta {
  id: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  altitudeFt: number | null;
  onGround: boolean;
  speedKt: number | null;
  heading: number | null;
  squawk: string | null;
  emergency: boolean;
  seenSeconds: number;
  predictedPath: Coordinates | null;
}

export interface AirQualityStation {
  id: number;
  code: string;
  name: string;
  lat: number;
  lng: number;
  address: {
    street: string | null;
    city: string;
    commune: string;
    district: string;
    province: string;
  };
}

export interface AirQualitySubIndex {
  calculatedAt: string | null;
  value: number | null;
  categoryName: string | null;
}

export interface AirQualityIndex extends AirQualitySubIndex {
  so2: AirQualitySubIndex;
  no2: AirQualitySubIndex;
  pm10: AirQualitySubIndex;
  pm25: AirQualitySubIndex;
  o3: AirQualitySubIndex;
  overallValue: number;
  overallCategoryName: string;
}

export interface SmogMeta {
  station: AirQualityStation;
  airQuality: AirQualityIndex;
}

export type FireConfidence = "low" | "nominal" | "high";

export interface FireMeta {
  intensity: 1 | 2 | 3;
  frp: number;
  confidence: FireConfidence;
  satellite: string;
  isDaytime: boolean;
  detectedAt: string;
}

export interface FloodMeta {
  warningLevel: 1 | 2;
  station: string;
  river: string;
  waterLevel: number;
  warningThreshold: number;
  alarmThreshold: number;
  measuredAt: string;
}

export interface AedMeta {
  access: string | null;
  emergency: string;
  level: string | null;
  phone: string | null;
  emergencyPhone: string | null;
  openingHours: string | null;
  indoor: string | null;
  defibrillatorLocation: string | null;
}

export interface ReportMeta {
  reportEventType: ReportEventType;
  description: string;
}

export interface LayerMetadata {
  [Layer.Shelters]: ShelterMeta;
  [Layer.Drones]: DroneMeta;
  [Layer.Aircraft]: AircraftMeta;
  [Layer.Smog]: SmogMeta;
  [Layer.Fires]: FireMeta;
  [Layer.Floods]: FloodMeta;
  [Layer.AEDs]: AedMeta;
  [Layer.Reports]: ReportMeta;
}

export interface LayerLocation<L extends Layer = Layer> extends Coordinates {
  meta: LayerMetadata[L];
}

export interface LayerCluster extends Coordinates {
  count: number;
}

export interface LayerData<L extends Layer = Layer> {
  points: LayerLocation<L>[];
  clusters: LayerCluster[];
}

export type LayerFetchFunction<L extends Layer = Layer> = (
  viewport: Viewport,
) => Promise<LayerData<L>>;

export type EnabledLayers = Record<Layer, boolean>;

export type LayerPoint = {
  [L in Layer]: LayerLocation<L> & { layer: L };
}[Layer];

export interface LayerClusterWithLayer extends LayerCluster {
  layer: Layer;
}
