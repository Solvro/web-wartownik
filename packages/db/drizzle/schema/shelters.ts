import { SHELTER_AVAILABILITIES } from "@wartownik/shared/config/shelters";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { geometryPoint } from "./types";

export const shelterAvailabilityEnum = pgEnum(
  "shelter_availability",
  SHELTER_AVAILABILITIES,
);

export const shelters = pgTable(
  "shelters",
  {
    id: varchar({ length: 32 }).primaryKey(),
    location: geometryPoint().notNull(),
    address: text(),
    commune: varchar({ length: 255 }),
    county: varchar({ length: 255 }),
    voivodeship: varchar({ length: 255 }),
    availability: shelterAvailabilityEnum().notNull(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (table) => [index("shelters_location_idx").using("gist", table.location)],
);
