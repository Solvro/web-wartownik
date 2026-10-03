import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { geographyPoint } from "./types";

export const defibrillators = pgTable(
  "defibrillators",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    osmId: varchar("osm_id", { length: 255 }).notNull().unique(),
    osmType: varchar("osm_type", { length: 255 }).notNull(),
    osmVersion: integer("osm_version"),
    location: geographyPoint().notNull(),
    access: varchar({ length: 255 }),
    indoor: varchar({ length: 255 }),
    emergency: varchar({ length: 255 }).notNull().default("defibrillator"),
    phone: varchar({ length: 255 }),
    openingHours: varchar("opening_hours", { length: 255 }),
    emergencyPhone: varchar("emergency_phone", { length: 255 }),
    defibrillatorLocation: text("defibrillator_location"),
    defibrillatorLocationPl: text("defibrillator_location_pl"),
    defibrillatorLocationEn: text("defibrillator_location_en"),
    level: varchar({ length: 255 }),
    checkDate: varchar("check_date", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("defibrillators_location_idx").using("gist", table.location),
  ],
);
