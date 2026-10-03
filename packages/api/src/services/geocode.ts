import type { GeocodeResult } from "@wartownik/shared/types/geocode";

import { fetchQuery } from "../helpers/fetch-query";

const PHOTON_URL = "https://photon.komoot.io/api";
const SEARCH_BBOX = "13.5,48.8,24.5,55.1";

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

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const url = `${PHOTON_URL}?${new URLSearchParams({
    q: query,
    limit: "6",
    bbox: SEARCH_BBOX,
  })}`;
  const { features } = await fetchQuery<{ features: PhotonFeature[] }>(url, {
    headers: { "User-Agent": "defensownik.solvro.pl" },
    next: { revalidate: 86400 },
  });
  const seen = new Set<string>();
  return features.map(toResult).filter((result) => {
    const key = `${result.label}|${result.context}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
