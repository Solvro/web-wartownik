import { threatPositions } from "@wartownik/db";
import { lt } from "drizzle-orm";

import { getDb } from "../db";
import type { Threat } from "../services/drones";

export const THREAT_HISTORY_RETENTION_MS = 48 * 60 * 60 * 1000;

type PositionInsert = typeof threatPositions.$inferInsert;

function toDate(value: string | undefined): Date | null {
  if (value === undefined) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function positionsOf(threat: Threat): PositionInsert[] {
  const base = {
    threatId: threat.id,
    type: threat.type,
  };
  const positions: PositionInsert[] = [];
  for (const point of threat.trail ?? []) {
    const recordedAt = toDate(point.t);
    if (
      recordedAt !== null &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lon)
    ) {
      positions.push({ ...base, lat: point.lat, lng: point.lon, recordedAt });
    }
  }
  const current = toDate(threat.confirmedAt ?? threat.updatedAt);
  if (
    current !== null &&
    Number.isFinite(threat.lat) &&
    Number.isFinite(threat.lon)
  ) {
    positions.push({
      ...base,
      lat: threat.lat,
      lng: threat.lon,
      recordedAt: current,
    });
  }
  return positions;
}

export async function recordThreatPositions(
  threats: Threat[],
): Promise<number> {
  const positions = threats
    .filter((threat) => threat.areaOnly !== true)
    .flatMap(positionsOf);
  if (positions.length === 0) {
    return 0;
  }
  const inserted = await getDb()
    .insert(threatPositions)
    .values(positions)
    .onConflictDoNothing()
    .returning({ id: threatPositions.id });
  return inserted.length;
}

export async function pruneThreatPositions(): Promise<void> {
  await getDb()
    .delete(threatPositions)
    .where(
      lt(
        threatPositions.recordedAt,
        new Date(Date.now() - THREAT_HISTORY_RETENTION_MS),
      ),
    );
}
