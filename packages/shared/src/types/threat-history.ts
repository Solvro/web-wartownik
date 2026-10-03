import type { ThreatType } from "./layers";

export type ThreatHistorySample = [lat: number, lng: number, timestamp: number];

export interface ThreatHistoryTrack {
  id: string;
  type: ThreatType;
  samples: ThreatHistorySample[];
}

export interface ThreatHistory {
  from: number;
  to: number;
  tracks: ThreatHistoryTrack[];
}
