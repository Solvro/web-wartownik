import { REPORT_EVENT_TYPES } from "@defensownik/shared/config/reports";
import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const reportEventTypeEnum = pgEnum(
  "report_event_type",
  REPORT_EVENT_TYPES,
);

export const reports = pgTable("reports", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportEventType: reportEventTypeEnum().notNull(),
  description: text().notNull(),
  lat: doublePrecision().notNull(),
  lng: doublePrecision().notNull(),
});
