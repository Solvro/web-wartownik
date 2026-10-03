export const REPORT_EVENT_TYPES = [
  "drone",
  "protest",
  "no_energy",
  "other",
] as const;

export type ReportEventType = (typeof REPORT_EVENT_TYPES)[number];

export const REPORT_EVENT_TYPE_LABELS: Record<ReportEventType, string> = {
  drone: "Dron",
  protest: "Protest",
  no_energy: "Brak prądu",
  other: "Inne",
};

export const REPORT_DESCRIPTION_MAX_LENGTH = 500;
