import { createEnv } from "@t3-oss/env-nextjs";
import { config } from "dotenv";
import { z } from "zod";

try {
  config({ path: ".env.local", quiet: true });
} catch {}

const DEFAULT_SITE_URL = "https://defensownik.solvro.pl";
const DEFAULT_AUTHOR_NAME = "Solvro London";

export const env = createEnv({
  server: {
    DATABASE_URI: z.string().min(1),
    NASA_FIRMS_MAP_KEY: z.string().length(32),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_ANALYTICS_SRC: z.url().optional(),
    NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_AUTHOR_NAME: z.string().min(1),
    NEXT_PUBLIC_AUTHOR_URL: z.url().optional(),
  },
  runtimeEnv: {
    DATABASE_URI: process.env.DATABASE_URI,
    NASA_FIRMS_MAP_KEY: process.env.NASA_FIRMS_MAP_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
    NEXT_PUBLIC_ANALYTICS_SRC: process.env.NEXT_PUBLIC_ANALYTICS_SRC,
    NEXT_PUBLIC_ANALYTICS_WEBSITE_ID:
      process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID,
    NEXT_PUBLIC_AUTHOR_NAME:
      process.env.NEXT_PUBLIC_AUTHOR_NAME || DEFAULT_AUTHOR_NAME,
    NEXT_PUBLIC_AUTHOR_URL: process.env.NEXT_PUBLIC_AUTHOR_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});
