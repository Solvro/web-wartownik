"use client";

import { Route } from "lucide-react";

import { useThreatTrack } from "@/hooks/use-threat-track";
import { conjugateNumeric } from "@/lib/helpers/numerals";

export function ThreatTrackInfo({ threatId }: { threatId: string }) {
  const { data } = useThreatTrack(threatId);
  if (data === undefined) {
    return null;
  }
  const first = data[0];
  const last = data.at(-1);
  const minutes =
    first === undefined || last === undefined
      ? 0
      : Math.round((last.timestamp - first.timestamp) / 60000);

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Route className="size-3.5 shrink-0" />
      {data.length < 2
        ? "Przebyta trasa pojawi się po kolejnych meldunkach."
        : `Przebyta trasa: ${data.length} ${conjugateNumeric(data.length, "meldun", "ek", "ki", "ków")} z ostatnich ${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`}`}
    </p>
  );
}
