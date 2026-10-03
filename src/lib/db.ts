import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "@/env";

import * as schema from "../../drizzle/schema";

export const db = drizzle({
  connection: { connectionString: env.DATABASE_URI, ssl: false },
  schema,
});
