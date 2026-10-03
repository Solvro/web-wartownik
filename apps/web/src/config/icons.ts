import { isIconName } from "@defensownik/shared/config/icons";
import type { IconName } from "@defensownik/shared/config/icons";
import {
  Bomb as BombNode,
  Drone as DroneNode,
  Flame as FlameNode,
  Megaphone as MegaphoneNode,
  MessageSquareWarning as MessageSquareWarningNode,
  Plane as PlaneNode,
  Radar as RadarNode,
  Rocket as RocketNode,
  SquareActivity as SquareActivityNode,
  Warehouse as WarehouseNode,
  Waves as WavesNode,
  Wind as WindNode,
  Zap as ZapNode,
} from "lucide";
import type { IconNode } from "lucide";
import {
  Bomb,
  Drone,
  Flame,
  Megaphone,
  MessageSquareWarning,
  Plane,
  Radar,
  Rocket,
  SquareActivity,
  Warehouse,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ICONS = {
  bomb: { component: Bomb, node: BombNode },
  drone: { component: Drone, node: DroneNode },
  flame: { component: Flame, node: FlameNode },
  megaphone: { component: Megaphone, node: MegaphoneNode },
  "message-square-warning": {
    component: MessageSquareWarning,
    node: MessageSquareWarningNode,
  },
  plane: { component: Plane, node: PlaneNode },
  radar: { component: Radar, node: RadarNode },
  rocket: { component: Rocket, node: RocketNode },
  "square-activity": { component: SquareActivity, node: SquareActivityNode },
  warehouse: { component: Warehouse, node: WarehouseNode },
  waves: { component: Waves, node: WavesNode },
  wind: { component: Wind, node: WindNode },
  zap: { component: Zap, node: ZapNode },
} satisfies Record<IconName, { component: LucideIcon; node: IconNode }>;

export type { IconName };
export { isIconName };
