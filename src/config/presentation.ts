import type { IconName } from "@/config/icons";
import type { ReportEventType } from "@/config/reports";
import type { ShelterAvailability } from "@/config/shelters";
import type { ThreatConfidence, ThreatType } from "@/types/layers";

interface StatusVisual {
  color: string;
  label: string;
}

export const SHELTER_AVAILABILITY_VISUALS: Record<
  ShelterAvailability,
  StatusVisual
> = {
  always: { color: "#059669", label: "Dostępny całodobowo" },
  scheduled: { color: "#d97706", label: "Dostępny w określonych godzinach" },
  on_demand: { color: "#475569", label: "Udostępniany na żądanie" },
};

export const THREAT_VISUALS: Record<
  ThreatType,
  StatusVisual & { icon: IconName }
> = {
  uav: { label: "Dron uderzeniowy", color: "#b91c1c", icon: "drone" },
  fpv: { label: "Dron FPV", color: "#b91c1c", icon: "drone" },
  recon: { label: "Dron rozpoznawczy", color: "#0369a1", icon: "radar" },
  missile: { label: "Pocisk manewrujący", color: "#9f1239", icon: "rocket" },
  ballistic: { label: "Pocisk balistyczny", color: "#701a75", icon: "rocket" },
  kab: { label: "Bomba szybująca (KAB)", color: "#9a3412", icon: "bomb" },
  mig31k: { label: "Lotnictwo (MiG-31K)", color: "#6d28d9", icon: "plane" },
  unknown: {
    label: "Niezidentyfikowany obiekt",
    color: "#52525b",
    icon: "drone",
  },
};

export const THREAT_ADVISORY_COLOR = "#64748b";

export const THREAT_CONFIDENCE_LABELS: Record<ThreatConfidence, string> = {
  low: "niska",
  medium: "średnia",
  high: "wysoka",
};

export const AIR_QUALITY_CLASSES: StatusVisual[] = [
  { color: "#16a34a", label: "Bardzo dobra" },
  { color: "#65a30d", label: "Dobra" },
  { color: "#ca8a04", label: "Umiarkowana" },
  { color: "#ea580c", label: "Dostateczna" },
  { color: "#dc2626", label: "Zła" },
  { color: "#7e22ce", label: "Bardzo zła" },
];

export const FIRE_LEVELS: Record<1 | 2 | 3, StatusVisual> = {
  1: { color: "#f59e0b", label: "Niska moc (< 5 MW)" },
  2: { color: "#ea580c", label: "Średnia moc (5–20 MW)" },
  3: { color: "#b91c1c", label: "Wysoka moc (> 20 MW)" },
};

export const FLOOD_LEVELS: Record<1 | 2, StatusVisual> = {
  1: { color: "#2563eb", label: "Przekroczony stan ostrzegawczy" },
  2: { color: "#dc2626", label: "Przekroczony stan alarmowy" },
};

export const AED_COLOR = "#e11d48";
export const REPORT_COLOR = "#7c3aed";

export const REPORT_ICONS: Partial<Record<ReportEventType, IconName>> = {
  drone: "drone",
  no_energy: "zap",
  protest: "megaphone",
};

export const REPORT_FALLBACK_ICON: IconName = "message-square-warning";

export const AIRCRAFT_EMERGENCY_COLOR = "#dc2626";
export const AIRCRAFT_GROUND_COLOR = "#64748b";
