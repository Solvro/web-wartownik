export interface AircraftPhoto {
  src: string;
  width: number;
  height: number;
  link: string;
  photographer: string;
}

export interface AircraftTrackPoint {
  lat: number;
  lng: number;
  altitudeFt: number | null;
  timestamp: number;
}

export interface AircraftDetails {
  description: string | null;
  photo: AircraftPhoto | null;
  track: AircraftTrackPoint[];
}
