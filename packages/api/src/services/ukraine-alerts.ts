import raionsGeometry from "@wartownik/shared/geo/ukraine-raions.json";
import type {
  UkraineAlertLevel,
  UkraineAlerts,
} from "@wartownik/shared/types/ukraine-alerts";

import { fetchQuery } from "../helpers/fetch-query";

const NEPTUN_ALERTS_URL = "https://neptun.in.ua/api/v1/alerts";

const RAION_ALIASES: Record<string, string> = {
  новомосковський: "самарівський",
};

interface NeptunAlert {
  key: string;
  oblast: string;
  since: string;
  level: string;
  reasons?: string[];
}

interface RaionProperties {
  id: string;
  key: string;
  oblastId: string;
  oblastKey: string;
}

const raions = (
  raionsGeometry as unknown as { features: { properties: RaionProperties }[] }
).features.map((feature) => feature.properties);

const oblastIdByKey = new Map(
  raions.map((raion) => [raion.oblastKey, raion.oblastId]),
);
const raionByKey = new Map(
  raions.map((raion) => [`${raion.oblastKey}|${raion.key}`, raion]),
);

const normalizeOblast = (name: string) =>
  name
    .toLowerCase()
    .replace(" область", "")
    .replace(/^м\.\s*/, "")
    .trim();

const toLevel = (level: string): UkraineAlertLevel =>
  level === "yellow" ? "yellow" : "red";

export async function getUkraineAlerts(): Promise<UkraineAlerts> {
  const data = await fetchQuery<{
    updatedAt: string;
    oblasts: NeptunAlert[];
    raions: NeptunAlert[];
  }>(NEPTUN_ALERTS_URL, {
    headers: { "User-Agent": "defensownik.solvro.pl" },
    next: { revalidate: 30 },
  });

  const oblasts = data.oblasts.flatMap((alert) => {
    const oblastId = oblastIdByKey.get(normalizeOblast(alert.key));
    return oblastId === undefined
      ? []
      : [
          {
            oblastId,
            level: toLevel(alert.level),
            since: alert.since,
            reasons: alert.reasons ?? [],
          },
        ];
  });

  const raionAlerts = data.raions.flatMap((alert) => {
    const key = RAION_ALIASES[alert.key] ?? alert.key;
    const raion = raionByKey.get(`${normalizeOblast(alert.oblast)}|${key}`);
    return raion === undefined
      ? []
      : [
          {
            raionId: raion.id,
            oblastId: raion.oblastId,
            level: toLevel(alert.level),
            since: alert.since,
            reasons: alert.reasons ?? [],
          },
        ];
  });

  return { updatedAt: data.updatedAt, oblasts, raions: raionAlerts };
}
