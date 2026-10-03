import { z } from "zod";

const schema = z.object({
  DATABASE_URI: z.string().min(1),
  NASA_FIRMS_MAP_KEY: z.string().length(32),
  SITE_URL: z.url().default("https://defensownik.solvro.pl"),
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
});

type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached !== null) {
    return cached;
  }
  const raw = {
    DATABASE_URI: process.env.DATABASE_URI,
    NASA_FIRMS_MAP_KEY: process.env.NASA_FIRMS_MAP_KEY,
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || undefined,
  };
  cached =
    process.env.SKIP_ENV_VALIDATION === "true"
      ? (raw as ServerEnv)
      : schema.parse(raw);
  return cached;
}
