const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString("pl-PL", DATE_FORMAT);
}

const decimal = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCount(total: number): string {
  if (total < 1000) {
    return String(total);
  }
  if (total < 10_000) {
    return `${decimal.format(Math.floor(total / 100) / 10)}k`;
  }
  return `${Math.round(total / 1000)}k`;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m od Ciebie`;
  }
  if (km < 10) {
    return `${decimal.format(km)} km od Ciebie`;
  }
  return `${Math.round(km)} km od Ciebie`;
}
