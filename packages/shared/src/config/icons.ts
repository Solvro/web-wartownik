export const ICON_NAMES = [
  "bomb",
  "drone",
  "flame",
  "megaphone",
  "message-square-warning",
  "plane",
  "radar",
  "rocket",
  "square-activity",
  "warehouse",
  "waves",
  "wind",
  "zap",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const isIconName = (name: string): name is IconName =>
  (ICON_NAMES as readonly string[]).includes(name);
