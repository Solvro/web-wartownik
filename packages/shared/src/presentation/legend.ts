import type { IconName } from "../config/icons";
import { LAYER_VISUALS } from "../config/layer-visuals";
import {
  AED_COLOR,
  AIRCRAFT_EMERGENCY_COLOR,
  AIRCRAFT_GROUND_COLOR,
  AIR_QUALITY_CLASSES,
  FIRE_LEVELS,
  FLOOD_LEVELS,
  REPORT_COLOR,
  REPORT_FALLBACK_ICON,
  REPORT_ICONS,
  SHELTER_AVAILABILITY_VISUALS,
  THREAT_ADVISORY_COLOR,
  THREAT_VISUALS,
} from "../config/presentation";
import { REPORT_EVENT_TYPE_LABELS } from "../config/reports";
import type { ReportEventType } from "../config/reports";
import { Layer } from "../types/layers";
import type { ThreatType } from "../types/layers";

export interface LegendEntry {
  label: string;
  color: string;
  icon: IconName;
}

const LEGEND_THREATS: ThreatType[] = [
  "uav",
  "missile",
  "ballistic",
  "kab",
  "mig31k",
];
const LEGEND_REPORTS: ReportEventType[] = [
  "drone",
  "no_energy",
  "protest",
  "other",
];

const withLayerIcon = (
  layer: Layer,
  entries: { label: string; color: string }[],
) => entries.map((entry) => ({ ...entry, icon: LAYER_VISUALS[layer].icon }));

export const LEGEND: Record<Layer, LegendEntry[]> = {
  [Layer.Shelters]: withLayerIcon(
    Layer.Shelters,
    Object.values(SHELTER_AVAILABILITY_VISUALS),
  ),
  [Layer.Drones]: [
    ...LEGEND_THREATS.map((type) => THREAT_VISUALS[type]),
    {
      label: "Obserwacja bez alarmu",
      color: THREAT_ADVISORY_COLOR,
      icon: LAYER_VISUALS[Layer.Drones].icon,
    },
  ],
  [Layer.Aircraft]: withLayerIcon(Layer.Aircraft, [
    { label: "W powietrzu", color: LAYER_VISUALS[Layer.Aircraft].color },
    { label: "Na ziemi", color: AIRCRAFT_GROUND_COLOR },
    {
      label: "Sygnał alarmowy (squawk 7500/7600/7700)",
      color: AIRCRAFT_EMERGENCY_COLOR,
    },
  ]),
  [Layer.Smog]: withLayerIcon(Layer.Smog, AIR_QUALITY_CLASSES),
  [Layer.Fires]: withLayerIcon(Layer.Fires, Object.values(FIRE_LEVELS)),
  [Layer.Floods]: withLayerIcon(Layer.Floods, Object.values(FLOOD_LEVELS)),
  [Layer.AEDs]: withLayerIcon(Layer.AEDs, [
    { label: "Defibrylator AED", color: AED_COLOR },
  ]),
  [Layer.Reports]: LEGEND_REPORTS.map((type) => ({
    label: REPORT_EVENT_TYPE_LABELS[type],
    color: REPORT_COLOR,
    icon: REPORT_ICONS[type] ?? REPORT_FALLBACK_ICON,
  })),
};
