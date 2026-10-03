import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const DEFAULT_SITE_URL = "https://defensownik.solvro.pl";
const DEFAULT_AUTHOR_NAME = "Solvro London";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_ANALYTICS_SRC: z.url().optional(),
    NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_AUTHOR_NAME: z.string().min(1),
    NEXT_PUBLIC_AUTHOR_URL: z.url().optional(),
  },
  runtimeEnv: {
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
