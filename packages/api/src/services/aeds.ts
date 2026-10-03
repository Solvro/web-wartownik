import { defibrillators } from "@wartownik/db";
import {
  MAX_DB_POINTS,
  SERVER_CLUSTERING_MAX_ZOOM,
} from "@wartownik/shared/config/constants";
import type {
  Layer,
  LayerData,
  LayerFetchFunction,
} from "@wartownik/shared/types/layers";
import { and, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { getDb } from "../db";
import { envelope } from "../helpers/sql";
import { clusterOnGrid } from "./clustering";

async function selectAeds(where: SQL | undefined) {
  const rows = await getDb()
    .select({
      lat: sql<number>`ST_Y(${defibrillators.location}::geometry)`,
      lng: sql<number>`ST_X(${defibrillators.location}::geometry)`,
      access: defibrillators.access,
      emergency: defibrillators.emergency,
      level: defibrillators.level,
      phone: defibrillators.phone,
      emergencyPhone: defibrillators.emergencyPhone,
      openingHours: defibrillators.openingHours,
      indoor: defibrillators.indoor,
      defibrillatorLocation: sql<
        string | null
      >`coalesce(${defibrillators.defibrillatorLocation}, ${defibrillators.defibrillatorLocationPl}, ${defibrillators.defibrillatorLocationEn})`,
    })
    .from(defibrillators)
    .where(where)
    .limit(MAX_DB_POINTS);
  return rows.map(({ lat, lng, ...meta }) => ({
    lat: Number(lat),
    lng: Number(lng),
    meta,
  }));
}

export const getAeds: LayerFetchFunction<Layer.AEDs> = async (
  viewport,
): Promise<LayerData<Layer.AEDs>> => {
  const inViewport = sql`${defibrillators.location} && ${envelope(viewport.bounds)}::geography`;

  if (viewport.zoom > SERVER_CLUSTERING_MAX_ZOOM) {
    return { points: await selectAeds(inViewport), clusters: [] };
  }

  const { clusters, singleIds } = await clusterOnGrid({
    from: sql`${defibrillators}`,
    geometry: sql`${defibrillators.location}::geometry`,
    id: sql`${defibrillators.id}`,
    where: inViewport,
    viewport,
  });
  const points =
    singleIds.length > 0
      ? await selectAeds(
          and(inViewport, inArray(defibrillators.id, singleIds.map(Number))),
        )
      : [];
  return { points, clusters };
};
