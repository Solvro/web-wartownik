import { parseWarsawDate } from "@/lib/helpers/dates";
import { fetchQuery } from "@/lib/helpers/fetch-query";
import type { Layer, LayerFetchFunction, LayerLocation } from "@/types/layers";

const IMGW_HYDRO_URL = "https://danepubliczne.imgw.pl/api/data/hydro/";
const MAX_MEASUREMENT_AGE_MS = 48 * 60 * 60 * 1000;

interface HydroStation {
  id_stacji: string;
  stacja: string;
  rzeka: string | null;
  wojewodztwo: string | null;
  lat: string | null;
  lon: string | null;
  stan_wody: string | null;
  stan_wody_data_pomiaru: string | null;
  stan_ostrzegawczy: string | null;
  stan_alarmowy: string | null;
}

const toNumber = (value: string | null) =>
  value === null ? Number.NaN : Number.parseFloat(value);

export const getFloods: LayerFetchFunction<Layer.Floods> = async () => {
  const stations = await fetchQuery<HydroStation[]>(IMGW_HYDRO_URL, {
    next: { revalidate: 900 },
  });
  const now = Date.now();

  const points = stations.flatMap((station): LayerLocation<Layer.Floods>[] => {
    if (station.stan_wody_data_pomiaru === null) {
      return [];
    }
    const lat = toNumber(station.lat);
    const lng = toNumber(station.lon);
    const waterLevel = toNumber(station.stan_wody);
    const warningThreshold = toNumber(station.stan_ostrzegawczy);
    const alarmThreshold = toNumber(station.stan_alarmowy);
    if (
      ![lat, lng, waterLevel, warningThreshold, alarmThreshold].every(
        Number.isFinite,
      ) ||
      waterLevel < warningThreshold
    ) {
      return [];
    }
    const measuredAt = parseWarsawDate(station.stan_wody_data_pomiaru);
    const measuredAtMs = measuredAt.getTime();
    if (
      Number.isNaN(measuredAtMs) ||
      now - measuredAtMs > MAX_MEASUREMENT_AGE_MS
    ) {
      return [];
    }
    return [
      {
        lat,
        lng,
        meta: {
          warningLevel: waterLevel >= alarmThreshold ? 2 : 1,
          station: station.stacja,
          river: station.rzeka ?? "",
          waterLevel,
          warningThreshold,
          alarmThreshold,
          measuredAt: measuredAt.toISOString(),
        },
      },
    ];
  });

  return { points, clusters: [] };
};
