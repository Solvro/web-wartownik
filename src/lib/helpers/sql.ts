import { sql } from "drizzle-orm";

import type { Bounds } from "@/types/map";

export function envelope({ nw, se }: Bounds) {
  return sql`ST_MakeEnvelope(${nw.lng}, ${se.lat}, ${se.lng}, ${nw.lat}, 4326)`;
}
