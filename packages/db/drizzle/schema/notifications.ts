import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const regionAlertStatusEnum = pgEnum("region_alert_status", [
  "none",
  "watch",
  "approaching",
  "threat",
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  token: varchar({ length: 255 }).notNull().unique(),
  platform: varchar({ length: 16 }).notNull(),
  regionIds: text("region_ids").array().notNull(),
  minStatus: regionAlertStatusEnum("min_status")
    .notNull()
    .default("approaching"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const regionAlertState = pgTable("region_alert_state", {
  regionId: varchar("region_id", { length: 16 }).primaryKey(),
  status: regionAlertStatusEnum().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
