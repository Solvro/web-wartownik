export type PlaneVariant = "plane-east" | "plane-west";

export interface HeadingIcon {
  variant: PlaneVariant;
  rotation: number;
}

export function planeHeadingIcon(heading: number): HeadingIcon {
  const normalized = ((heading % 360) + 360) % 360;
  return normalized < 180
    ? { variant: "plane-east", rotation: normalized - 90 }
    : { variant: "plane-west", rotation: normalized - 270 };
}
