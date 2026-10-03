import { db } from "@/lib/db";
import type { Layer, LayerFetchFunction } from "@/types/layers";

import { reports } from "../../../drizzle/schema";

export const getReports: LayerFetchFunction<Layer.Reports> = async () => {
  const rows = await db.select().from(reports);
  return {
    points: rows.map(({ lat, lng, reportEventType, description }) => ({
      lat,
      lng,
      meta: { reportEventType, description },
    })),
    clusters: [],
  };
};
