import { useQuery } from "@tanstack/react-query";
import { localizeStyle } from "@wartownik/shared/map-style";

import { API_URL } from "@/lib/config";

type Style = {
  layers: { id: string; type: string; layout?: Record<string, unknown> }[];
};

const STYLE_URL = `${API_URL}/api/map/styles/dark`;
const STYLE_STALE_MS = 24 * 60 * 60 * 1000;

const OFFLINE_STYLE = {
  version: 8,
  glyphs: `${API_URL}/api/map/fonts/{fontstack}/{range}.pbf`,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0B1120" },
    },
  ],
};

export function useBaseStyle() {
  const { data } = useQuery({
    queryKey: ["base-style", STYLE_URL],
    queryFn: async ({ signal }) => {
      const response = await fetch(STYLE_URL, { signal });
      return localizeStyle((await response.json()) as Style);
    },
    staleTime: STYLE_STALE_MS,
    networkMode: "offlineFirst",
  });
  return data ?? OFFLINE_STYLE;
}
