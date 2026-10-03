import {
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const threatPositions = pgTable(
  "threat_positions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    threatId: varchar("threat_id", { length: 64 }).notNull(),
    type: varchar({ length: 16 }).notNull(),
    lat: doublePrecision().notNull(),
    lng: doublePrecision().notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("threat_positions_threat_time_idx").on(
      table.threatId,
      table.recordedAt,
    ),
    index("threat_positions_recorded_at_idx").on(table.recordedAt),
  ],
);
