import { after } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { POLAND_BOUNDS, POLAND_CENTER } from "@/config/constants";
import { LAYER_CONFIG, layerFromSlug } from "@/config/layers";
import { LAYER_FETCHERS } from "@/lib/services";
import { syncSheltersIfStale } from "@/lib/services/shelters";
import { Layer } from "@/types/layers";
import type { LayerFetchFunction } from "@/types/layers";
import type { Viewport } from "@/types/map";

const viewportSchema = z.object({
  west: z.coerce.number().min(-180).max(180).default(POLAND_BOUNDS.west),
  east: z.coerce.number().min(-180).max(180).default(POLAND_BOUNDS.east),
  south: z.coerce.number().min(-90).max(90).default(POLAND_BOUNDS.south),
  north: z.coerce.number().min(-90).max(90).default(POLAND_BOUNDS.north),
  zoom: z.coerce.number().min(0).max(22).default(6),
  lat: z.coerce.number().min(-90).max(90).default(POLAND_CENTER.lat),
  lng: z.coerce.number().min(-180).max(180).default(POLAND_CENTER.lng),
});

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/layers/[layer]">,
) {
  const { layer: slug } = await ctx.params;
  const layer = layerFromSlug(slug);
  if (layer === undefined) {
    return Response.json({ error: "Unknown layer" }, { status: 404 });
  }

  const parsed = viewportSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid viewport" }, { status: 400 });
  }

  const { west, east, south, north, zoom, lat, lng } = parsed.data;
  const viewport: Viewport = {
    bounds: { nw: { lat: north, lng: west }, se: { lat: south, lng: east } },
    zoom,
    center: { lat, lng },
  };

  if (layer === Layer.Shelters) {
    after(syncSheltersIfStale);
  }

  try {
    const fetchLayer = LAYER_FETCHERS[layer] as LayerFetchFunction;
    const data = await fetchLayer(viewport);
    return Response.json(data, {
      headers: { "Cache-Control": LAYER_CONFIG[layer].cacheControl },
    });
  } catch (error) {
    console.error(`Failed to fetch layer ${layer}:`, error);
    return Response.json(
      { error: "Failed to fetch layer data" },
      { status: 502 },
    );
  }
}
