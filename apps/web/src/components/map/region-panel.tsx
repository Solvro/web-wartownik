"use client";

import { THREAT_VISUALS } from "@defensownik/shared/config/presentation";
import {
  REGION_COUNTRY_LABELS,
  REGION_KIND_LABELS,
  REGION_STATUS_VISUALS,
} from "@defensownik/shared/regions";
import type { RegionState } from "@defensownik/shared/regions";
import type { Layer, LayerLocation } from "@defensownik/shared/types/layers";
import { Maximize2, X } from "lucide-react";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

interface RegionContentProps {
  region: RegionState;
  threats: LayerLocation<Layer.Drones>[];
  onZoom(): void;
  onSelectThreat(id: string): void;
  onClose?: () => void;
}

export function RegionContent({
  region,
  threats,
  onZoom,
  onSelectThreat,
  onClose,
}: RegionContentProps) {
  const visual = REGION_STATUS_VISUALS[region.status];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            {REGION_KIND_LABELS[region.kind]}
            {region.country === "PL"
              ? null
              : ` · ${REGION_COUNTRY_LABELS[region.country]}`}
          </p>
          <h2 className="text-lg leading-tight font-semibold">{region.name}</h2>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: visual.color,
              backgroundColor: `color-mix(in srgb, ${visual.color} 14%, transparent)`,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: visual.color }}
            />
            {visual.label}
            {region.etaMinutes === null
              ? ""
              : ` · ok. ${region.etaMinutes} min`}
          </span>
        </div>
        {onClose === undefined ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X />
          </Button>
        )}
      </div>

      {region.threats.length === 0 ? (
        <p className="rounded-xl border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
          {region.country === "PL"
            ? "W promieniu 50 km od granic województwa nie ma obecnie zgłoszonych zagrożeń powietrznych."
            : "W granicach regionu nie ma obecnie zgłoszonych zagrożeń powietrznych."}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-muted/40">
          {region.threats.map((entry) => {
            const threat = threats.find(
              (item) => item.meta.id === entry.threatId,
            );
            if (threat === undefined) {
              return null;
            }
            const type = THREAT_VISUALS[threat.meta.type];
            const status = REGION_STATUS_VISUALS[entry.status];
            return (
              <li key={entry.threatId}>
                <button
                  type="button"
                  onClick={() => onSelectThreat(entry.threatId)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-foreground/5"
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: type.color }}
                  >
                    <Icon name={type.icon} className="size-3.5 text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {type.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.distanceKm === 0
                        ? "w granicach regionu"
                        : `${Math.round(entry.distanceKm)} km od granicy`}
                      {entry.etaMinutes === null
                        ? ""
                        : ` · ETA ok. ${entry.etaMinutes} min`}
                    </span>
                  </span>
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Status liczony z pozycji, kursu i niepewności położenia obiektów z
        agregatora OSINT. To nie jest oficjalny system ostrzegania – kieruj się
        syrenami, alertami RCB i komunikatami służb.
      </p>

      <Button variant="outline" onClick={onZoom}>
        <Maximize2 />
        Pokaż na mapie
      </Button>
    </div>
  );
}
