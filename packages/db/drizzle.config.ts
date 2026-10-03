import { defineConfig } from "drizzle-kit";

import { loadRootEnv } from "./src/env";

loadRootEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URI ?? "", ssl: false },
  extensionsFilters: ["postgis"],
});
