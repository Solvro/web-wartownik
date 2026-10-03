import { BASE_MAP_STYLES, localizeStyle } from "@defensownik/shared/map-style";
import { useQuery } from "@tanstack/react-query";

type Style = {
  layers: { id: string; type: string; layout?: Record<string, unknown> }[];
};

const OFFLINE_STYLE = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
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
    queryKey: ["base-style", BASE_MAP_STYLES.dark],
    queryFn: async ({ signal }) => {
      const response = await fetch(BASE_MAP_STYLES.dark, { signal });
      return localizeStyle((await response.json()) as Style);
    },
    staleTime: Infinity,
    networkMode: "offlineFirst",
  });
  return data ?? OFFLINE_STYLE;
}
