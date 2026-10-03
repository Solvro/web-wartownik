import { createDb } from "../src";
import { loadRootEnv } from "../src/env";

loadRootEnv();

const databaseUri = process.env.DATABASE_URI;
if (databaseUri === undefined || databaseUri === "") {
  throw new Error("DATABASE_URI is not set");
}

export const db = createDb(databaseUri);
