import { threatPositions } from "@defensownik/db";
import type { ThreatTrackPoint } from "@defensownik/shared/types/threat-track";
import { and, asc, eq, gte } from "drizzle-orm";

import { getDb } from "../db";
import { THREAT_HISTORY_RETENTION_MS } from "../jobs/record-threat-positions";

export async function getThreatTrack(
  threatId: string,
): Promise<ThreatTrackPoint[]> {
  const rows = await getDb()
    .select({
      lat: threatPositions.lat,
      lng: threatPositions.lng,
      recordedAt: threatPositions.recordedAt,
    })
    .from(threatPositions)
    .where(
      and(
        eq(threatPositions.threatId, threatId),
        gte(
          threatPositions.recordedAt,
          new Date(Date.now() - THREAT_HISTORY_RETENTION_MS),
        ),
      ),
    )
    .orderBy(asc(threatPositions.recordedAt));
  const track: ThreatTrackPoint[] = [];
  for (const { lat, lng, recordedAt } of rows) {
    const previous = track.at(-1);
    if (
      previous !== undefined &&
      previous.lat === lat &&
      previous.lng === lng
    ) {
      continue;
    }
    track.push({ lat, lng, timestamp: recordedAt.getTime() });
  }
  return track;
}
