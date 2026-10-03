const WARSAW_TIME_ZONE = "Europe/Warsaw";

function warsawOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function parseWarsawDate(value: string): Date {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      value.trim(),
    );
  if (match === null) {
    return new Date(Number.NaN);
  }
  const [, year, month, day, hour, minute, second = "0"] = match;
  const naiveUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const firstGuess = naiveUtc - warsawOffsetMs(new Date(naiveUtc));
  return new Date(naiveUtc - warsawOffsetMs(new Date(firstGuess)));
}

export function deserializeNullableDate(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = parseWarsawDate(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
