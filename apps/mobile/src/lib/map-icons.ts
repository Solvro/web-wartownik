import type { IconName } from "@wartownik/shared/config/icons";
import type { PlaneVariant } from "@wartownik/shared/heading-icon";

export const MAP_ICON_IMAGES: Record<IconName | PlaneVariant, number> = {
  bomb: require("../../assets/map-icons/bomb.png"),
  drone: require("../../assets/map-icons/drone.png"),
  flame: require("../../assets/map-icons/flame.png"),
  megaphone: require("../../assets/map-icons/megaphone.png"),
  "message-square-warning": require("../../assets/map-icons/message-square-warning.png"),
  plane: require("../../assets/map-icons/plane.png"),
  "plane-east": require("../../assets/map-icons/plane-east.png"),
  "plane-west": require("../../assets/map-icons/plane-west.png"),
  radar: require("../../assets/map-icons/radar.png"),
  rocket: require("../../assets/map-icons/rocket.png"),
  "square-activity": require("../../assets/map-icons/square-activity.png"),
  warehouse: require("../../assets/map-icons/warehouse.png"),
  waves: require("../../assets/map-icons/waves.png"),
  wind: require("../../assets/map-icons/wind.png"),
  zap: require("../../assets/map-icons/zap.png"),
};
