import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "../drizzle/schema";

export function createDb(connectionString: string) {
  return drizzle({ connection: { connectionString, ssl: false }, schema });
}

export type Database = ReturnType<typeof createDb>;
