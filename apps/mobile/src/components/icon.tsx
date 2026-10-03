import type { IconName } from "@defensownik/shared/config/icons";
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
} from "lucide-react-native";
import type { LucideIcon, LucideProps } from "lucide-react-native";

const ICONS: Record<IconName, LucideIcon> = {
  bomb: Bomb,
  drone: Drone,
  flame: Flame,
  megaphone: Megaphone,
  "message-square-warning": MessageSquareWarning,
  plane: Plane,
  radar: Radar,
  rocket: Rocket,
  "square-activity": SquareActivity,
  warehouse: Warehouse,
  waves: Waves,
  wind: Wind,
  zap: Zap,
};

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Component = ICONS[name];
  return <Component {...props} />;
}
