"use client";

import { TriangleAlert } from "lucide-react";

import { REGION_STATUS_VISUALS } from "@/lib/regions";
import type { RegionState } from "@/lib/regions";

import { regionAlertText, sortedAlerts } from "./situation-card";

export function AlertBar({
  regions,
  onSelectRegion,
}: {
  regions: RegionState[];
  onSelectRegion(regionId: string): void;
}) {
  const alerts = sortedAlerts(regions);
  const top = alerts[0];
  if (top === undefined) {
    return null;
  }
  const color = REGION_STATUS_VISUALS[top.status].color;

  return (
    <button
      type="button"
      onClick={() => onSelectRegion(top.id)}
      className="pointer-events-auto flex max-w-full animate-in items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-left text-sm font-medium text-white shadow-lg fade-in slide-in-from-top-2"
      style={{ backgroundColor: color, boxShadow: `0 8px 30px -8px ${color}` }}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
        <TriangleAlert className="size-4" />
      </span>
      <span className="truncate">{regionAlertText(top)}</span>
      {alerts.length > 1 ? (
        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs">
          +{alerts.length - 1}
        </span>
      ) : null}
    </button>
  );
}
