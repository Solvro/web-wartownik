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
  THREAT_CONFIDENCE_LABELS,
  THREAT_VISUALS,
} from "../config/presentation";
import { REPORT_EVENT_TYPE_LABELS } from "../config/reports";
import { SHELTERS_SOURCE_URL } from "../config/shelters";
import { Layer } from "../types/layers";
import type { LayerLocation, LayerPoint } from "../types/layers";
import { formatDate } from "./format";

export interface Link {
  text: string;
  href: string;
}

export type DetailValue = string | number | Link | null;

export type RichText = (string | Link)[];

export interface DetailRow {
  label: string;
  value: DetailValue;
}

export interface LayerPresentation {
  color: string;
  icon: IconName;
  title: string;
  subtitle?: string | null;
  status?: string;
  details: DetailRow[];
  note?: RichText;
  heading?: number | null;
  pulse?: boolean;
  dimmed?: boolean;
  navigable?: boolean;
}

export const isLink = (value: unknown): value is Link =>
  typeof value === "object" && value !== null && "href" in value;

const orNoData = (value: string | number | null | undefined): DetailValue =>
  value === undefined || value === "" ? null : value;

const joinPresent = (parts: (string | null | undefined)[]) =>
  parts
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(", ");

function presentShelter({
  meta,
}: LayerLocation<Layer.Shelters>): LayerPresentation {
  const { color, label } = SHELTER_AVAILABILITY_VISUALS[meta.availability];
  return {
    color,
    icon: LAYER_VISUALS[Layer.Shelters].icon,
    title: "Punkt schronienia",
    subtitle: meta.address,
    status: label,
    details: [
      { label: "Gmina", value: orNoData(meta.commune) },
      { label: "Powiat", value: orNoData(meta.county) },
      { label: "Województwo", value: orNoData(meta.voivodeship) },
      { label: "Identyfikator", value: meta.id },
    ],
    note: [
      "Źródło: Komenda Główna PSP, ",
      { text: "gdziesieukryc.pl", href: SHELTERS_SOURCE_URL },
    ],
    navigable: true,
  };
}

function presentDrone({
  meta,
}: LayerLocation<Layer.Drones>): LayerPresentation {
  const visual = THREAT_VISUALS[meta.type];
  const details: LayerPresentation["details"] = [];
  if (meta.groupSize !== null) {
    details.push({ label: "Liczba obiektów", value: meta.groupSize });
  }
  if (meta.heading !== null) {
    details.push({ label: "Kurs", value: `${Math.round(meta.heading)}°` });
  }
  if (meta.speedKmh !== null) {
    details.push({
      label: "Prędkość",
      value: `${Math.round(meta.speedKmh)} km/h`,
    });
  }
  details.push(
    {
      label: "Pewność",
      value: `${THREAT_CONFIDENCE_LABELS[meta.confidence]} (źródła: ${meta.sourceCount})`,
    },
    { label: "Aktualizacja", value: orNoData(formatDate(meta.updatedAt)) },
  );

  return {
    color: meta.advisory ? THREAT_ADVISORY_COLOR : visual.color,
    icon: visual.icon,
    title: visual.label,
    subtitle: joinPresent([meta.locality, meta.region]),
    status: meta.advisory
      ? "Obserwacja – bez alarmu"
      : meta.stale
        ? "Brak świeżych potwierdzeń"
        : "Aktywne zagrożenie",
    details,
    note: [
      "Dane: ",
      {
        text: "Карта повітряних тривог — NEPTUN",
        href: "https://neptun.in.ua/",
      },
      ". To agregator OSINT, a nie oficjalny system ostrzegania. W Polsce kieruj się alertami RCB i komunikatami służb.",
    ],
    heading: meta.heading,
    pulse: !meta.advisory && !meta.stale,
    dimmed: meta.stale,
  };
}

const FEET_TO_M = 0.3048;
const KNOTS_TO_KMH = 1.852;

function presentAircraft({
  meta,
}: LayerLocation<Layer.Aircraft>): LayerPresentation {
  const visual = LAYER_VISUALS[Layer.Aircraft];
  const details: LayerPresentation["details"] = [
    { label: "Typ", value: orNoData(meta.aircraftType) },
    { label: "Rejestracja", value: orNoData(meta.registration) },
    {
      label: "Wysokość",
      value: meta.onGround
        ? "na ziemi"
        : orNoData(
            meta.altitudeFt === null
              ? null
              : `${Math.round(meta.altitudeFt * FEET_TO_M).toLocaleString("pl-PL")} m`,
          ),
    },
  ];
  if (meta.speedKt !== null) {
    details.push({
      label: "Prędkość",
      value: `${Math.round(meta.speedKt * KNOTS_TO_KMH)} km/h`,
    });
  }
  if (meta.heading !== null) {
    details.push({ label: "Kurs", value: `${Math.round(meta.heading)}°` });
  }
  details.push(
    { label: "Squawk", value: orNoData(meta.squawk) },
    { label: "Kod ICAO", value: meta.id.toUpperCase() },
    {
      label: "Ostatni sygnał",
      value: `${Math.round(meta.seenSeconds)} s temu`,
    },
  );

  return {
    color: meta.emergency
      ? AIRCRAFT_EMERGENCY_COLOR
      : meta.onGround
        ? AIRCRAFT_GROUND_COLOR
        : visual.color,
    icon: visual.icon,
    title: meta.callsign ?? "Samolot wojskowy",
    subtitle: joinPresent([meta.aircraftType, meta.registration]),
    status: meta.emergency
      ? "Sygnał alarmowy"
      : meta.onGround
        ? "Na ziemi"
        : "W powietrzu",
    details,
    note: [
      "Dane: ",
      { text: "adsb.lol", href: "https://adsb.lol/" },
      " (ADS-B, ODbL). Widoczne są tylko maszyny nadające transponderem – wiele lotów wojskowych nie pojawia się na mapie.",
    ],
    heading: meta.heading,
    pulse: meta.emergency,
  };
}

export function airQualityClass(overallValue: number): number {
  return Math.min(5, Math.max(0, Math.round(overallValue)));
}

function presentSmog({ meta }: LayerLocation<Layer.Smog>): LayerPresentation {
  const { station, airQuality } = meta;
  const airClass =
    AIR_QUALITY_CLASSES[airQualityClass(airQuality.overallValue)];
  const subIndexes = [
    { label: "PM10", index: airQuality.pm10 },
    { label: "PM2,5", index: airQuality.pm25 },
    { label: "NO₂", index: airQuality.no2 },
    { label: "SO₂", index: airQuality.so2 },
    { label: "O₃", index: airQuality.o3 },
  ];
  const categoryName = airQuality.categoryName ?? airClass.label;

  return {
    color: airClass.color,
    icon: LAYER_VISUALS[Layer.Smog].icon,
    title: station.name,
    subtitle: joinPresent([station.address.street, station.address.city]),
    status: `Jakość powietrza: ${categoryName}`.toLowerCase(),
    details: [
      ...subIndexes
        .filter(
          ({ index }) =>
            index.categoryName !== null && index.categoryName !== "",
        )
        .map(({ label, index }) => ({ label, value: index.categoryName })),
      { label: "Pomiar", value: orNoData(formatDate(airQuality.calculatedAt)) },
    ],
    note: ["Źródło: Główny Inspektorat Ochrony Środowiska"],
  };
}

function presentFire({ meta }: LayerLocation<Layer.Fires>): LayerPresentation {
  const level = FIRE_LEVELS[meta.intensity];
  return {
    color: level.color,
    icon: LAYER_VISUALS[Layer.Fires].icon,
    title: "Pożar wykryty z satelity",
    status: level.label,
    details: [
      { label: "Wykryto", value: orNoData(formatDate(meta.detectedAt)) },
      { label: "Moc promieniowania", value: `${meta.frp.toFixed(1)} MW` },
      {
        label: "Pewność detekcji",
        value: meta.confidence === "high" ? "wysoka" : "standardowa",
      },
      { label: "Pora", value: meta.isDaytime ? "dzień" : "noc" },
    ],
    note: [
      "Źródło: NASA FIRMS (VIIRS). Detekcje mogą obejmować także źródła przemysłowe.",
    ],
  };
}

function presentFlood({
  meta,
}: LayerLocation<Layer.Floods>): LayerPresentation {
  const level = FLOOD_LEVELS[meta.warningLevel];
  return {
    color: level.color,
    icon: LAYER_VISUALS[Layer.Floods].icon,
    title: meta.station,
    subtitle: `rzeka ${meta.river}`,
    status: level.label,
    details: [
      { label: "Stan wody", value: `${meta.waterLevel} cm` },
      { label: "Stan ostrzegawczy", value: `${meta.warningThreshold} cm` },
      { label: "Stan alarmowy", value: `${meta.alarmThreshold} cm` },
      { label: "Pomiar", value: orNoData(formatDate(meta.measuredAt)) },
    ],
    note: ["Źródło: IMGW-PIB"],
  };
}

function presentAed({ meta }: LayerLocation<Layer.AEDs>): LayerPresentation {
  const floor =
    meta.level === null || meta.level === "0"
      ? "parter"
      : `poziom ${meta.level}`;
  const placement = meta.indoor === "yes" ? "wewnątrz" : "na zewnątrz";
  const details: LayerPresentation["details"] = [
    { label: "Lokalizacja", value: `${floor}, ${placement}` },
  ];
  if (meta.openingHours !== null) {
    details.push({ label: "Godziny otwarcia", value: meta.openingHours });
  }
  if (meta.emergencyPhone !== null) {
    details.push({
      label: "Telefon",
      value: { text: meta.emergencyPhone, href: `tel:${meta.emergencyPhone}` },
    });
  }

  return {
    color: AED_COLOR,
    icon: LAYER_VISUALS[Layer.AEDs].icon,
    title: "Defibrylator AED",
    subtitle: meta.defibrillatorLocation,
    status: meta.access === "private" ? "Dostęp prywatny" : "Dostęp publiczny",
    details,
    note: ["Źródło: OpenStreetMap"],
    navigable: true,
  };
}

function presentReport({
  meta,
}: LayerLocation<Layer.Reports>): LayerPresentation {
  return {
    color: REPORT_COLOR,
    icon: REPORT_ICONS[meta.reportEventType] ?? REPORT_FALLBACK_ICON,
    title: REPORT_EVENT_TYPE_LABELS[meta.reportEventType] ?? "Zgłoszenie",
    status: "Zgłoszenie użytkownika",
    details: [{ label: "Opis", value: orNoData(meta.description) }],
    note: ["Zgłoszenia nie są weryfikowane."],
  };
}

export function presentPoint(point: LayerPoint): LayerPresentation {
  switch (point.layer) {
    case Layer.Shelters:
      return presentShelter(point);
    case Layer.Drones:
      return presentDrone(point);
    case Layer.Aircraft:
      return presentAircraft(point);
    case Layer.Smog:
      return presentSmog(point);
    case Layer.Fires:
      return presentFire(point);
    case Layer.Floods:
      return presentFlood(point);
    case Layer.AEDs:
      return presentAed(point);
    case Layer.Reports:
      return presentReport(point);
  }
}
