import { shelters } from "@wartownik/db";
import {
  MAX_DB_POINTS,
  SERVER_CLUSTERING_MAX_ZOOM,
} from "@wartownik/shared/config/constants";
import {
  SHELTERS_CSV_URL,
  SHELTERS_MIN_VALID_ROWS,
  SHELTERS_SYNC_INTERVAL_MS,
  SHELTERS_SYNC_LOCK_ID,
} from "@wartownik/shared/config/shelters";
import type { ShelterAvailability } from "@wartownik/shared/config/shelters";
import type {
  Layer,
  LayerData,
  LayerFetchFunction,
} from "@wartownik/shared/types/layers";
import { and, inArray, max, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { getDb } from "../db";
import { parseCsv } from "../helpers/csv";
import { fetchQuery } from "../helpers/fetch-query";
import { envelope } from "../helpers/sql";
import { clusterOnGrid } from "./clustering";

const AVAILABILITY_MAP: Record<string, ShelterAvailability> = {
  Całodobowa: "always",
  "Określone godziny": "scheduled",
  "Na żądanie": "on_demand",
};

const INSERT_BATCH_SIZE = 1000;

const nullableText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? null : trimmed;
};

function parseShelterRows(csv: string): (typeof shelters.$inferInsert)[] {
  return parseCsv(csv).flatMap((row) => {
    const id = row["Identyfikator publiczny"]?.trim();
    const lat = Number.parseFloat(row["Szerokosc geograficzna"] ?? "");
    const lng = Number.parseFloat(row["Dlugosc geograficzna"] ?? "");
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }
    return [
      {
        id,
        location: { lat, lng },
        address: nullableText(row.Adres),
        commune: nullableText(row.Gmina),
        county: nullableText(row.Powiat),
        voivodeship: nullableText(row.Wojewodztwo),
        availability:
          AVAILABILITY_MAP[row.Dostepnosc?.trim() ?? ""] ?? "on_demand",
      },
    ];
  });
}

export async function syncShelters(): Promise<number> {
  const csv = await fetchQuery<string>(
    SHELTERS_CSV_URL,
    { cache: "no-store" },
    false,
  );
  const rows = parseShelterRows(csv);
  if (rows.length < SHELTERS_MIN_VALID_ROWS) {
    throw new Error(
      `Shelters CSV has only ${rows.length} valid rows, refusing to replace data`,
    );
  }

  return getDb().transaction(async (tx) => {
    const { rows: lockRows } = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(${SHELTERS_SYNC_LOCK_ID}) AS locked`,
    );
    if (lockRows[0]?.locked !== true) {
      return 0;
    }
    await tx.delete(shelters);
    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      await tx
        .insert(shelters)
        .values(rows.slice(i, i + INSERT_BATCH_SIZE))
        .onConflictDoNothing();
    }
    return rows.length;
  });
}

let pendingSync: Promise<void> | null = null;

export function syncSheltersIfStale(): Promise<void> {
  pendingSync ??= (async () => {
    try {
      const [result] = await getDb()
        .select({ lastSync: max(shelters.syncedAt) })
        .from(shelters);
      const lastSync = result?.lastSync;
      if (
        lastSync == null ||
        Date.now() - lastSync.getTime() > SHELTERS_SYNC_INTERVAL_MS
      ) {
        await syncShelters();
      }
    } catch (error) {
      console.error("Failed to sync shelters:", error);
    } finally {
      pendingSync = null;
    }
  })();
  return pendingSync;
}

const shelterColumns = {
  id: shelters.id,
  lat: sql<number>`ST_Y(${shelters.location})`,
  lng: sql<number>`ST_X(${shelters.location})`,
  address: shelters.address,
  commune: shelters.commune,
  county: shelters.county,
  voivodeship: shelters.voivodeship,
  availability: shelters.availability,
};

async function selectShelters(where: SQL | undefined) {
  const rows = await getDb()
    .select(shelterColumns)
    .from(shelters)
    .where(where)
    .limit(MAX_DB_POINTS);
  return rows.map(({ lat, lng, ...meta }) => ({
    lat: Number(lat),
    lng: Number(lng),
    meta,
  }));
}

export const getShelters: LayerFetchFunction<Layer.Shelters> = async (
  viewport,
): Promise<LayerData<Layer.Shelters>> => {
  const inViewport = sql`${shelters.location} && ${envelope(viewport.bounds)}`;

  if (viewport.zoom > SERVER_CLUSTERING_MAX_ZOOM) {
    return { points: await selectShelters(inViewport), clusters: [] };
  }

  const { clusters, singleIds } = await clusterOnGrid({
    from: sql`${shelters}`,
    geometry: sql`${shelters.location}`,
    id: sql`${shelters.id}`,
    where: inViewport,
    viewport,
  });
  const points =
    singleIds.length > 0
      ? await selectShelters(and(inViewport, inArray(shelters.id, singleIds)))
      : [];
  return { points, clusters };
};
