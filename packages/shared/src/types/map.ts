export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Bounds {
  nw: Coordinates;
  se: Coordinates;
}

export interface Viewport {
  bounds: Bounds;
  zoom: number;
  center: Coordinates;
}
