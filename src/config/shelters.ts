export const SHELTER_AVAILABILITIES = [
  "always",
  "scheduled",
  "on_demand",
] as const;

export type ShelterAvailability = (typeof SHELTER_AVAILABILITIES)[number];

export const SHELTERS_CSV_URL =
  "https://gdziesieukryc.pl/PS_XML/punkty_schronienia.csv";
export const SHELTERS_SOURCE_URL = "https://gdziesieukryc.pl";
export const SHELTERS_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const SHELTERS_MIN_VALID_ROWS = 1000;
export const SHELTERS_SYNC_LOCK_ID = 7436001;
