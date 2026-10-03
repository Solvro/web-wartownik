import { count } from "drizzle-orm";
import type { FeatureCollection, Point } from "geojson";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { defibrillators } from "../drizzle/schema";
import { db } from "./db";

const BATCH_SIZE = 100;

interface AedProperties {
  "@osm_type": string;
  "@osm_id": number;
  "@osm_version"?: number;
  phone?: string;
  access?: string;
  indoor?: string;
  emergency?: string;
  opening_hours?: string;
  "emergency:phone"?: string;
  check_date?: string;
  "defibrillator:location"?: string;
  "defibrillator:location:pl"?: string;
  "defibrillator:location:en"?: string;
  level?: string;
}

type DefibrillatorInsert = typeof defibrillators.$inferInsert;

function toRecord({
  geometry,
  properties: p,
}: FeatureCollection<
  Point,
  AedProperties
>["features"][number]): DefibrillatorInsert {
  const [lng, lat] = geometry.coordinates;
  return {
    osmId: String(p["@osm_id"]),
    osmType: p["@osm_type"],
    osmVersion: p["@osm_version"] ?? null,
    location: `POINT(${lng} ${lat})`,
    access: p.access ?? null,
    indoor: p.indoor ?? null,
    emergency: p.emergency ?? "defibrillator",
    phone: p.phone ?? null,
    openingHours: p.opening_hours ?? null,
    emergencyPhone: p["emergency:phone"] ?? null,
    defibrillatorLocation: p["defibrillator:location"] ?? null,
    defibrillatorLocationPl: p["defibrillator:location:pl"] ?? null,
    defibrillatorLocationEn: p["defibrillator:location:en"] ?? null,
    level: p.level ?? null,
    checkDate: p.check_date ?? null,
  };
}

async function main() {
  const file = path.join(process.cwd(), "assets", "PL.geojson");
  const collection = JSON.parse(
    await readFile(file, "utf8"),
  ) as FeatureCollection<Point, AedProperties>;
  const records = collection.features.map(toRecord);

  await db.delete(defibrillators);

  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      await db.insert(defibrillators).values(batch);
      inserted += batch.length;
    } catch {
      for (const record of batch) {
        try {
          await db.insert(defibrillators).values(record);
          inserted++;
        } catch (error) {
          console.error("Failed to insert record:", record, error);
        }
      }
    }
  }

  const [total] = await db.select({ count: count() }).from(defibrillators);
  const samples = await db.select().from(defibrillators).limit(3);
  console.log(`Inserted ${inserted} defibrillators.`);
  console.log(`Total in table: ${total?.count ?? 0}`);
  console.log("Sample records:", samples);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
