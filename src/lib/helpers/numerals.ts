export function conjugateNumeric(
  count: number,
  base: string,
  sSingular: string,
  sFew: string,
  sMany: string,
): string {
  if (count === 1) {
    return base + sSingular;
  }
  const lastTwo = Math.abs(count) % 100;
  if (lastTwo >= 12 && lastTwo <= 14) {
    return base + sMany;
  }
  const last = Math.abs(count) % 10;
  return base + (last >= 2 && last <= 4 ? sFew : sMany);
}
