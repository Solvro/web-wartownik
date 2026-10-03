import type { NextRequest } from "next/server";
import { z } from "zod";

import { fetchQuery } from "@/lib/helpers/fetch-query";
import type { GeocodeResult } from "@/types/geocode";

const PHOTON_URL = "https://photon.komoot.io/api";
const SEARCH_BBOX = "13.5,48.8,24.5,55.1";

const querySchema = z.object({ q: z.string().trim().min(2).max(120) });

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    countrycode?: string;
    extent?: [number, number, number, number];
  };
}

function toResult({ geometry, properties: p }: PhotonFeature): GeocodeResult {
  const [lng, lat] = geometry.coordinates;
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const label = p.name ?? (street || p.city || "Bez nazwy");
  const context = [street !== label ? street : null, p.city, p.state]
    .filter((part): part is string => Boolean(part) && part !== label)
    .join(", ");
  const extent = p.extent;
  return {
    label,
    context,
    lat,
    lng,
    bounds:
      extent === undefined
        ? null
        : {
            nw: { lat: extent[1], lng: extent[0] },
            se: { lat: extent[3], lng: extent[2] },
          },
  };
}

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return Response.json({ results: [] });
  }
  const url = `${PHOTON_URL}?${new URLSearchParams({
    q: parsed.data.q,
    limit: "6",
    bbox: SEARCH_BBOX,
  })}`;

  try {
    const { features } = await fetchQuery<{ features: PhotonFeature[] }>(url, {
      headers: { "User-Agent": "defensownik.solvro.pl" },
      next: { revalidate: 86400 },
    });
    const seen = new Set<string>();
    const results = features.map(toResult).filter((result) => {
      const key = `${result.label}|${result.context}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (error) {
    console.error("Geocoding failed:", error);
    return Response.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
