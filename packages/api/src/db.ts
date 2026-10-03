import { createDb } from "@defensownik/db";
import type { Database } from "@defensownik/db";

import { serverEnv } from "./env";

const globalForDb = globalThis as typeof globalThis & {
  defensownikDb?: Database;
};

export function getDb(): Database {
  globalForDb.defensownikDb ??= createDb(serverEnv().DATABASE_URI);
  return globalForDb.defensownikDb;
}
