import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";

import { getDb } from "./db";
import { startThreatRecorder } from "./jobs/scheduler";
import { syncSheltersIfStale } from "./services/shelters";

const migrationsFolder = () =>
  process.env.MIGRATIONS_DIR ??
  path.resolve(process.cwd(), "../../packages/db/drizzle");

export async function runStartupTasks() {
  try {
    await migrate(getDb(), { migrationsFolder: migrationsFolder() });
  } catch (error) {
    console.error("Database migration failed:", error);
    return;
  }
  void syncSheltersIfStale();
  startThreatRecorder();
}
