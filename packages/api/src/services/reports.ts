import { reports } from "@defensownik/db";
import type {
  Layer,
  LayerFetchFunction,
} from "@defensownik/shared/types/layers";

import { getDb } from "../db";

export const getReports: LayerFetchFunction<Layer.Reports> = async () => {
  const rows = await getDb().select().from(reports);
  return {
    points: rows.map(({ lat, lng, reportEventType, description }) => ({
      lat,
      lng,
      meta: { reportEventType, description },
    })),
    clusters: [],
  };
};
