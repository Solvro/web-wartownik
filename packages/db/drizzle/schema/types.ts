import type { Coordinates } from "@wartownik/shared/types/map";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

export const geometryPoint = customType<{
  data: Coordinates;
  driverData: string;
}>({
  dataType() {
    return "geometry(Point, 4326)";
  },
  toDriver(value) {
    return sql`ST_SetSRID(ST_MakePoint(${value.lng}, ${value.lat}), 4326)`;
  },
});
