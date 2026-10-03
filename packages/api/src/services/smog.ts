import { getClosestPoints, isInBounds } from "@wartownik/shared/geo/geo";
import type {
  AirQualityIndex,
  AirQualityStation,
  AirQualitySubIndex,
  Layer,
  LayerFetchFunction,
  LayerLocation,
} from "@wartownik/shared/types/layers";

import { deserializeNullableDate } from "../helpers/dates";
import { fetchQuery } from "../helpers/fetch-query";

const GIOS_API = "https://api.gios.gov.pl/pjp-api/v1/rest";
const MAX_STATIONS = 30;
const WEEK_S = 7 * 24 * 60 * 60;

const CATEGORY_NAMES = [
  "Bardzo dobra",
  "Dobra",
  "Umiarkowana",
  "Dostateczna",
  "Zła",
  "Bardzo zła",
];

interface RawStation {
  "Identyfikator stacji": number;
  "Kod stacji": string;
  "Nazwa stacji": string;
  "WGS84 φ N": string;
  "WGS84 λ E": string;
  "Nazwa miasta": string;
  Gmina: string;
  Powiat: string;
  Województwo: string;
  Ulica: string | null;
}

type RawIndex = Record<string, string | number | null | undefined>;

const POLLUTANTS = {
  so2: "SO2",
  no2: "NO2",
  pm10: "PM10",
  pm25: "PM2.5",
  o3: "O3",
} as const;

let stationsMemo: Promise<AirQualityStation[]> | null = null;

async function fetchStations(): Promise<AirQualityStation[]> {
  const response = await fetchQuery<{
    "Lista stacji pomiarowych": RawStation[];
  }>(`${GIOS_API}/station/findAll?size=1000`, {
    next: { revalidate: WEEK_S },
  });
  return response["Lista stacji pomiarowych"].map((station) => ({
    id: station["Identyfikator stacji"],
    code: station["Kod stacji"],
    name: station["Nazwa stacji"],
    lat: Number.parseFloat(station["WGS84 φ N"]),
    lng: Number.parseFloat(station["WGS84 λ E"]),
    address: {
      street: station.Ulica,
      city: station["Nazwa miasta"],
      commune: station.Gmina,
      district: station.Powiat,
      province: station["Województwo"],
    },
  }));
}

function getStations(): Promise<AirQualityStation[]> {
  stationsMemo ??= fetchStations().catch((error: unknown) => {
    stationsMemo = null;
    throw error;
  });
  return stationsMemo;
}

const asNumber = (value: unknown) => (typeof value === "number" ? value : null);
const asString = (value: unknown) => (typeof value === "string" ? value : null);

function subIndex(raw: RawIndex, pollutant: string): AirQualitySubIndex {
  return {
    calculatedAt: deserializeNullableDate(
      asString(
        raw[`Data wykonania obliczeń indeksu dla wskaźnika ${pollutant}`],
      ),
    ),
    value: asNumber(raw[`Wartość indeksu dla wskaźnika ${pollutant}`]),
    categoryName: asString(
      raw[`Nazwa kategorii indeksu dla wskażnika ${pollutant}`],
    ),
  };
}

async function getIndex(stationId: number): Promise<AirQualityIndex> {
  const { AqIndex: raw } = await fetchQuery<{ AqIndex: RawIndex }>(
    `${GIOS_API}/aqindex/getIndex/${stationId}`,
    { next: { revalidate: 60 } },
  );
  const value = asNumber(raw["Wartość indeksu"]);
  const subIndexes = {
    so2: subIndex(raw, POLLUTANTS.so2),
    no2: subIndex(raw, POLLUTANTS.no2),
    pm10: subIndex(raw, POLLUTANTS.pm10),
    pm25: subIndex(raw, POLLUTANTS.pm25),
    o3: subIndex(raw, POLLUTANTS.o3),
  };

  let overallValue = value ?? Number.NaN;
  if (value === null) {
    const values = Object.values(subIndexes)
      .map((index) => index.value)
      .filter((v): v is number => v !== null);
    overallValue =
      values.length > 0
        ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
        : Number.NaN;
  }

  return {
    calculatedAt: deserializeNullableDate(
      asString(raw["Data wykonania obliczeń indeksu"]),
    ),
    value,
    categoryName: asString(raw["Nazwa kategorii indeksu"]),
    ...subIndexes,
    overallValue,
    overallCategoryName: CATEGORY_NAMES[overallValue] ?? "Brak danych",
  };
}

export const getAirQuality: LayerFetchFunction<Layer.Smog> = async ({
  bounds,
  center,
}) => {
  const stations = await getStations();
  const nearest = getClosestPoints(
    center,
    stations.filter((station) => isInBounds(station, bounds)),
    MAX_STATIONS,
  );

  const points = await Promise.all(
    nearest.map(
      async ({
        distance: _distance,
        ...station
      }): Promise<LayerLocation<Layer.Smog>> => ({
        lat: station.lat,
        lng: station.lng,
        meta: { station, airQuality: await getIndex(station.id) },
      }),
    ),
  );

  return {
    points: points.filter(
      (point) => !Number.isNaN(point.meta.airQuality.overallValue),
    ),
    clusters: [],
  };
};
