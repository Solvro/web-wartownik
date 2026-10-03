import type { Bounds } from "./map";

export interface GeocodeResult {
  label: string;
  context: string;
  lat: number;
  lng: number;
  bounds: Bounds | null;
}
