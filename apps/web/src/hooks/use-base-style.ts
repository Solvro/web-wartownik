import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { localizeStyle } from "@wartownik/shared/map-style";
import type { StyleSpecification } from "maplibre-gl";

import { MAP_STYLES } from "@/lib/map/styles";

export function useBaseStyle(dark: boolean) {
  const url = dark ? MAP_STYLES.dark : MAP_STYLES.light;
  return useQuery({
    queryKey: ["base-style", url],
    queryFn: async ({ signal }) => {
      const response = await fetch(url, { signal });
      return localizeStyle((await response.json()) as StyleSpecification);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: keepPreviousData,
  }).data;
}
