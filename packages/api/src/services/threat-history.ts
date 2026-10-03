import { threatPositions } from "@wartownik/db";
import type { ThreatType } from "@wartownik/shared/types/layers";
import type {
  ThreatHistory,
  ThreatHistoryTrack,
} from "@wartownik/shared/types/threat-history";
import { and, asc, gte, lte } from "drizzle-orm";

import { getDb } from "../db";

export async function getThreatHistory(
  from: number,
  to: number,
): Promise<ThreatHistory> {
  const rows = await getDb()
    .select({
      threatId: threatPositions.threatId,
      type: threatPositions.type,
      lat: threatPositions.lat,
      lng: threatPositions.lng,
      recordedAt: threatPositions.recordedAt,
    })
    .from(threatPositions)
    .where(
      and(
        gte(threatPositions.recordedAt, new Date(from)),
        lte(threatPositions.recordedAt, new Date(to)),
      ),
    )
    .orderBy(asc(threatPositions.recordedAt));

  const tracks = new Map<string, ThreatHistoryTrack>();
  for (const { threatId, type, lat, lng, recordedAt } of rows) {
    let track = tracks.get(threatId);
    if (track === undefined) {
      track = { id: threatId, type: type as ThreatType, samples: [] };
      tracks.set(threatId, track);
    }
    const previous = track.samples.at(-1);
    if (previous?.[0] === lat && previous[1] === lng) {
      continue;
    }
    track.samples.push([lat, lng, recordedAt.getTime()]);
  }
  return { from, to, tracks: [...tracks.values()] };
}
