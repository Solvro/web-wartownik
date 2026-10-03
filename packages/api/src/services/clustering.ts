import { CLUSTER_RADIUS_PX } from "@wartownik/shared/config/constants";
import { degreesPerPixel } from "@wartownik/shared/geo/geo";
import type { LayerCluster } from "@wartownik/shared/types/layers";
import type { Viewport } from "@wartownik/shared/types/map";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { getDb } from "../db";

interface ClusterOnGridOptions {
  from: SQL;
  geometry: SQL;
  id: SQL;
  where: SQL;
  viewport: Viewport;
}

type GridCell = {
  count: number;
  lat: number;
  lng: number;
  id: string;
};

export async function clusterOnGrid({
  from,
  geometry,
  id,
  where,
  viewport,
}: ClusterOnGridOptions): Promise<{
  clusters: LayerCluster[];
  singleIds: string[];
}> {
  const cellLng = degreesPerPixel(viewport.zoom) * CLUSTER_RADIUS_PX;
  const cellLat = cellLng * Math.cos((viewport.center.lat * Math.PI) / 180);

  const { rows } = await getDb().execute<GridCell>(sql`
    SELECT
      count(*)::int AS count,
      avg(ST_Y(g)) AS lat,
      avg(ST_X(g)) AS lng,
      min(id)::text AS id
    FROM (SELECT ${geometry} AS g, ${id} AS id FROM ${from} WHERE ${where}) AS points
    GROUP BY ST_SnapToGrid(g, ${cellLng}, ${cellLat})
  `);

  const clusters: LayerCluster[] = [];
  const singleIds: string[] = [];
  for (const row of rows) {
    if (row.count > 1) {
      clusters.push({
        lat: Number(row.lat),
        lng: Number(row.lng),
        count: row.count,
      });
    } else {
      singleIds.push(row.id);
    }
  }
  return { clusters, singleIds };
}
