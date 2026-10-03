import { createDb } from "@wartownik/db";
import type { Database } from "@wartownik/db";

import { serverEnv } from "./env";

const globalForDb = globalThis as typeof globalThis & {
  wartownikDb?: Database;
};

export function getDb(): Database {
  globalForDb.wartownikDb ??= createDb(serverEnv().DATABASE_URI);
  return globalForDb.wartownikDb;
}
