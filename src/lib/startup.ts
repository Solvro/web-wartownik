import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";

import { db } from "@/lib/db";
import { syncSheltersIfStale } from "@/lib/services/shelters";

export async function runStartupTasks() {
  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  } catch (error) {
    console.error("Database migration failed:", error);
    return;
  }
  void syncSheltersIfStale();
}
