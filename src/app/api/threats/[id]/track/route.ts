import type { NextRequest } from "next/server";

import { getThreatTrack } from "@/lib/services/threat-track";

const ID_PATTERN = /^[\w-]{1,64}$/;

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/threats/[id]/track">,
) {
  const { id } = await ctx.params;
  if (!ID_PATTERN.test(id)) {
    return Response.json({ error: "Invalid threat id" }, { status: 400 });
  }
  try {
    return Response.json(
      { track: await getThreatTrack(id) },
      {
        headers: {
          "Cache-Control": "public, max-age=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to fetch threat track ${id}:`, error);
    return Response.json({ error: "Failed to fetch track" }, { status: 502 });
  }
}
