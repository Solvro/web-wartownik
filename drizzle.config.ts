import { defineConfig } from "drizzle-kit";

import { env } from "./src/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: env.DATABASE_URI, ssl: false },
  extensionsFilters: ["postgis"],
});
