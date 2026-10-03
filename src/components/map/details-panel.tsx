"use client";

import { Navigation, X } from "lucide-react";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { useMap } from "@/hooks/use-map";
import { haversineDistance } from "@/lib/helpers/geo";
import { presentPoint } from "@/lib/presentation";
import { formatDistance } from "@/lib/presentation/format";
import { Layer } from "@/types/layers";
import type { LayerPoint } from "@/types/layers";

import { AircraftExtras } from "./aircraft-extras";

export function DetailsContent({
  point,
  onClose,
}: {
  point: LayerPoint;
  onClose?: () => void;
}) {
  const { userLocation } = useMap();
  const { color, icon, title, subtitle, status, details, note, navigable } =
    presentPoint(point);
  const distance =
    navigable === true && userLocation !== null
      ? formatDistance(haversineDistance(userLocation, point))
      : null;
  const isDemo = "demo" in point.meta && point.meta.demo === true;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-md"
          style={{
            backgroundColor: color,
            boxShadow: `0 6px 18px -6px ${color}`,
          }}
        >
          <Icon name={icon} className="size-5 text-white" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="leading-tight font-semibold">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {status ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  color,
                  backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {status}
              </span>
            ) : null}
            {isDemo ? (
              <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black">
                SYMULACJA
              </span>
            ) : null}
            {distance === null ? null : (
              <span className="text-xs text-muted-foreground">{distance}</span>
            )}
          </div>
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

      {point.layer === Layer.Aircraft ? (
        <AircraftExtras hex={point.meta.id} />
      ) : null}

      {details.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border bg-muted/40 px-3.5 py-3 text-sm">
          {details.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {note ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
      ) : null}

      {navigable ? (
        <Button asChild className="w-full">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation />
            Wyznacz trasę
          </a>
        </Button>
      ) : null}
    </div>
  );
}
