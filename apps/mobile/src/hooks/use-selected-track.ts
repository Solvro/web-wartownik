import { useQuery } from "@tanstack/react-query";
import { presentPoint } from "@wartownik/shared/presentation/index";
import { Layer } from "@wartownik/shared/types/layers";
import type { LayerPoint } from "@wartownik/shared/types/layers";
import type { Coordinates } from "@wartownik/shared/types/map";
import { useMemo } from "react";

import { useTRPC } from "@/lib/trpc";

const AIRCRAFT_TRACK_COLOR = "#22d3ee";

export function useAircraftDetails(point: LayerPoint | undefined) {
  const trpc = useTRPC();
  const hex = point?.layer === Layer.Aircraft ? point.meta.id : null;
  return useQuery({
    ...trpc.aircraft.details.queryOptions({ hex: hex ?? "000000" }),
    enabled: hex !== null,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useThreatTrack(point: LayerPoint | undefined) {
  const trpc = useTRPC();
  const id =
    point?.layer === Layer.Drones && point.meta.demo !== true
      ? point.meta.id
      : null;
  return useQuery({
    ...trpc.threats.track.queryOptions({ id: id ?? "none" }),
    enabled: id !== null,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useSelectedTrack(point: LayerPoint | undefined): {
  history: Coordinates[];
  color: string;
} {
  const aircraft = useAircraftDetails(point);
  const threat = useThreatTrack(point);
  return useMemo(() => {
    if (point?.layer === Layer.Aircraft && aircraft.data !== undefined) {
      return {
        history: [...aircraft.data.track, point],
        color: AIRCRAFT_TRACK_COLOR,
      };
    }
    if (point?.layer === Layer.Drones && threat.data !== undefined) {
      return { history: threat.data, color: presentPoint(point).color };
    }
    return { history: [], color: AIRCRAFT_TRACK_COLOR };
  }, [point, aircraft.data, threat.data]);
}
