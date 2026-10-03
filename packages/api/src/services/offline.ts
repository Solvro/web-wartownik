import { defibrillators, shelters } from "@wartownik/db";
import type { Layer, LayerLocation } from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
import { sql } from "drizzle-orm";

import { getDb } from "../db";

const MAX_PACK_POINTS = 20_000;

export interface OfflinePack {
  center: Coordinates;
  radiusKm: number;
  generatedAt: string;
  shelters: LayerLocation<Layer.Shelters>[];
  aeds: LayerLocation<Layer.AEDs>[];
}

export async function getOfflinePack(
  center: Coordinates,
  radiusKm: number,
): Promise<OfflinePack> {
  const db = getDb();
  const origin = sql`ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography`;
  const radiusM = radiusKm * 1000;

  const [shelterRows, aedRows] = await Promise.all([
    getDb()
      .select({
        id: shelters.id,
        lat: sql<number>`ST_Y(${shelters.location})`,
        lng: sql<number>`ST_X(${shelters.location})`,
        address: shelters.address,
        commune: shelters.commune,
        county: shelters.county,
        voivodeship: shelters.voivodeship,
        availability: shelters.availability,
      })
      .from(shelters)
      .where(
        sql`ST_DWithin(${shelters.location}::geography, ${origin}, ${radiusM})`,
      )
      .limit(MAX_PACK_POINTS),
    getDb()
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
      .where(sql`ST_DWithin(${defibrillators.location}, ${origin}, ${radiusM})`)
      .limit(MAX_PACK_POINTS),
  ]);

  return {
    center,
    radiusKm,
    generatedAt: new Date().toISOString(),
    shelters: shelterRows.map(({ lat, lng, ...meta }) => ({
      lat: Number(lat),
      lng: Number(lng),
      meta,
    })),
    aeds: aedRows.map(({ lat, lng, ...meta }) => ({
      lat: Number(lat),
      lng: Number(lng),
      meta,
    })),
  };
}
