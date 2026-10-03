import type { NextRequest } from "next/server";

import { getAircraftDetails } from "@/lib/services/aircraft-details";

const HEX_PATTERN = /^[0-9a-f]{6}$/;

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/aircraft/[hex]">,
) {
  const hex = (await ctx.params).hex.toLowerCase();
  if (!HEX_PATTERN.test(hex)) {
    return Response.json({ error: "Invalid ICAO address" }, { status: 400 });
  }
  return Response.json(await getAircraftDetails(hex), {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
