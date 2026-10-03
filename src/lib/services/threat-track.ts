import { and, asc, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { THREAT_HISTORY_RETENTION_MS } from "@/lib/jobs/record-threat-positions";
import type { ThreatTrackPoint } from "@/types/threat-track";

import { threatPositions } from "../../../drizzle/schema";

export async function getThreatTrack(
  threatId: string,
): Promise<ThreatTrackPoint[]> {
  const rows = await db
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
    if (previous?.lat === lat && previous.lng === lng) {
      continue;
    }
    track.push({ lat, lng, timestamp: recordedAt.getTime() });
  }
  return track;
}
