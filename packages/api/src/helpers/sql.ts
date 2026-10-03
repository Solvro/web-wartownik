import type { Bounds } from "@wartownik/shared/types/map";
import { sql } from "drizzle-orm";

export function envelope({ nw, se }: Bounds) {
  return sql`ST_MakeEnvelope(${nw.lng}, ${se.lat}, ${se.lng}, ${nw.lat}, 4326)`;
}
