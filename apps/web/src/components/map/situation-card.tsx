"use client";

import { conjugateNumeric } from "@wartownik/shared/geo/numerals";
import {
  REGION_STATUS_RANK,
  REGION_STATUS_VISUALS,
  regionGenitive,
} from "@wartownik/shared/regions";
import type { RegionState } from "@wartownik/shared/regions";
import { ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function regionAlertText(region: RegionState): string {
  const name = `woj. ${regionGenitive(region.name)}`;
  switch (region.status) {
    case "threat":
      return `Zagrożenie powietrzne nad obszarem ${name}`;
    case "approaching":
      return `Zagrożenie zbliża się do ${name}${region.etaMinutes === null ? "" : ` – ok. ${region.etaMinutes} min`}`;
    case "watch":
      return `Zagrożenie w pobliżu ${name}`;
    case "none":
      return "";
  }
}

export function sortedAlerts(regions: RegionState[]): RegionState[] {
  return regions
    .filter((region) => region.country === "PL" && region.status !== "none")
    .sort(
      (a, b) =>
        REGION_STATUS_RANK[b.status] - REGION_STATUS_RANK[a.status] ||
        (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity),
    );
}

interface SituationCardProps {
  regions: RegionState[];
  threatCount: number;
  updatedAt: number | undefined;
  demo: boolean;
  historical?: boolean;
  onSelectRegion(regionId: string): void;
}

export function SituationCard({
  regions,
  threatCount,
  updatedAt,
  demo,
  historical = false,
  onSelectRegion,
}: SituationCardProps) {
  const alerts = sortedAlerts(regions);
  const top = alerts[0];
  const color =
    top === undefined ? "#16a34a" : REGION_STATUS_VISUALS[top.status].color;

  return (
    <section
      className="overflow-hidden rounded-xl border bg-background"
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${color} 14%, transparent), transparent 70%)`,
      }}
    >
      <div className="flex items-start gap-3 p-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          {top === undefined ? (
            <ShieldCheck className="size-5" />
          ) : (
            <TriangleAlert className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold">
            {top === undefined
              ? "Brak zagrożeń powietrznych nad Polską"
              : alerts.length === 1
                ? REGION_STATUS_VISUALS[top.status].label
                : `Alerty w ${alerts.length} województwach`}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex size-1.5">
              {historical ? null : (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={`relative inline-flex size-1.5 rounded-full ${historical ? "bg-blue-500" : "bg-emerald-500"}`}
              />
            </span>
            {historical ? "Historia" : "Na żywo"}
            {updatedAt === undefined
              ? null
              : ` · ${timeFormat.format(updatedAt)}`}
            {` · ${threatCount} ${conjugateNumeric(threatCount, "obiekt", "", "y", "ów")} w regionie`}
          </p>
        </div>
        {demo ? (
          <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black">
            SYMULACJA
          </span>
        ) : null}
      </div>
      {alerts.length > 0 ? (
        <ul className="border-t border-inherit">
          {alerts.slice(0, 4).map((region) => (
            <li key={region.id}>
              <button
                type="button"
                onClick={() => onSelectRegion(region.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-foreground/5"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    region.status === "threat" && "animate-pulse",
                  )}
                  style={{
                    backgroundColor: REGION_STATUS_VISUALS[region.status].color,
                  }}
                />
                <span className="flex-1">{regionAlertText(region)}</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
