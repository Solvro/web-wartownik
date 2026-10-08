"use client";

import {
  AIRSPACE_COLORS,
  airspaceTypeInfo,
  formatAltitude,
} from "@wartownik/shared/airspace";
import type { AirspaceZoneProperties } from "@wartownik/shared/types/airspace";
import { ChevronRight, Plane, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const LEGEND = [
  { label: "TRA / TSA / MRT", color: AIRSPACE_COLORS.routine },
  { label: "D / R / NPZ / ADHOC", color: AIRSPACE_COLORS.notable },
];

export function AirspaceToggle({
  enabled,
  count,
  onChange,
}: {
  enabled: boolean;
  count: number | undefined;
  onChange(enabled: boolean): void;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${enabled ? "bg-muted/50" : "border-transparent"}`}
    >
      <label
        htmlFor="airspace-zones"
        className="flex cursor-pointer items-center gap-3"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            color: enabled ? "#fff" : AIRSPACE_COLORS.routine,
            backgroundColor: enabled
              ? AIRSPACE_COLORS.routine
              : `color-mix(in srgb, ${AIRSPACE_COLORS.routine} 14%, transparent)`,
          }}
        >
          <Plane className="size-4" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Strefy PAŻP</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">
            Aktywne strefy przestrzeni powietrznej (AUP/UUP)
          </span>
        </span>
        {enabled && count !== undefined ? (
          <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            {count}
          </span>
        ) : null}
        <Switch
          id="airspace-zones"
          checked={enabled}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-blue-600"
        />
      </label>
      {enabled ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {LEGEND.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-1.5 rounded-full border bg-background/70 py-0.5 pr-2 pl-1 text-[11px]"
            >
              <span
                className="size-3 rounded-sm border border-dashed"
                style={{
                  borderColor: item.color,
                  backgroundColor: `color-mix(in srgb, ${item.color} 30%, transparent)`,
                }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AirspaceZoneContent({
  zone,
  regionLabel,
  onSelectRegion,
  onClose,
}: {
  zone: AirspaceZoneProperties;
  regionLabel(regionId: string): string;
  onSelectRegion(regionId: string): void;
  onClose?: () => void;
}) {
  const info = airspaceTypeInfo(zone.type);
  const color = zone.notable
    ? AIRSPACE_COLORS.notable
    : AIRSPACE_COLORS.routine;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: color }}
        >
          <Plane className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            {info.name} · {zone.type}
          </p>
          <h2 className="leading-tight font-semibold">{zone.id}</h2>
          <p className="mt-1 text-sm" style={{ color }}>
            {zone.activated ? "Aktywowana" : "Zaplanowana"}
          </p>
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

      <p className="text-sm leading-relaxed">{info.description}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Rezerwacja</dt>
        <dd>
          {timeFormat.format(new Date(zone.start))} –{" "}
          {timeFormat.format(new Date(zone.end))}
        </dd>
        <dt className="text-muted-foreground">Pułap</dt>
        <dd>
          {formatAltitude(zone.lower)} – {formatAltitude(zone.upper)}
        </dd>
        {zone.regionId === null ? null : (
          <>
            <dt className="text-muted-foreground">Województwo</dt>
            <dd>
              <button
                type="button"
                onClick={() => onSelectRegion(zone.regionId as string)}
                className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
              >
                {regionLabel(zone.regionId)}
                <ChevronRight className="size-3.5" />
              </button>
            </dd>
          </>
        )}
        {zone.remarks === null ? null : (
          <>
            <dt className="text-muted-foreground">Adnotacja PAŻP</dt>
            <dd className="font-mono text-xs leading-5">{zone.remarks}</dd>
          </>
        )}
      </dl>

      <p className="text-xs leading-relaxed text-muted-foreground">
        To informacja, nie alarm — strefy nie zmieniają statusu województw.
        Pomarańczowe są strefy rzadsze (D, R, NPZ, ADHOC), niebieskie to
        rutynowe rezerwacje dla ćwiczeń i lotów wojskowych. Plan dobowy bywa
        przedłużany. Źródło: PAŻP (AUP/UUP).
      </p>
    </div>
  );
}
