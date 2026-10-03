import type { UkraineAlertLevel } from "./types/ukraine-alerts";

const REASON_TRANSLATIONS: [RegExp, string][] = [
  [/ракетн/i, "zagrożenie rakietowe"],
  [/балісти/i, "zagrożenie balistyczne"],
  [/дрон|бпла|шахед/i, "zagrożenie dronami"],
  [/авіац/i, "zagrożenie lotnicze"],
  [/артилер/i, "zagrożenie artyleryjskie"],
  [/вуличн|бої/i, "walki uliczne"],
  [/хімічн/i, "zagrożenie chemiczne"],
  [/ядерн|радіац/i, "zagrożenie radiacyjne"],
];

export const UKRAINE_ALERT_VISUALS: Record<
  UkraineAlertLevel,
  { color: string; label: string }
> = {
  red: { color: "#dc2626", label: "poziom czerwony" },
  yellow: { color: "#eab308", label: "poziom żółty" },
};

export function translateAlertReason(reason: string): string {
  const match = REASON_TRANSLATIONS.find(([pattern]) => pattern.test(reason));
  return match === undefined ? "alarm powietrzny" : match[1];
}
