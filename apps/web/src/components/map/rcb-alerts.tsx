"use client";

import { isActiveRcbAirAlert } from "@wartownik/shared/regions";
import type { RcbAlert } from "@wartownik/shared/types/rcb-alerts";
import { ChevronRight, ExternalLink, Megaphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const RCB_AIR_COLOR = "#eab308";
const RCB_INFO_COLOR = "#64748b";

const dayFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
});
const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatIssued = (alert: RcbAlert) =>
  (alert.issuedAtPrecision === "day" ? dayFormat : timeFormat).format(
    new Date(alert.issuedAt),
  );

const alertColor = (alert: RcbAlert) =>
  isActiveRcbAirAlert(alert) ? RCB_AIR_COLOR : RCB_INFO_COLOR;

function statusLabel(alert: RcbAlert) {
  if (alert.air) {
    return alert.cancelled ? "Odwołany" : "Zagrożenie z powietrza";
  }
  return "Komunikat";
}

export function RcbAlertsCard({
  alerts,
  regionLabel,
  onSelect,
}: {
  alerts: RcbAlert[];
  regionLabel(regionId: string): string;
  onSelect(alertId: string): void;
}) {
  if (alerts.length === 0) {
    return null;
  }
  const activeAir = alerts.filter(isActiveRcbAirAlert).length;
  const color = activeAir > 0 ? RCB_AIR_COLOR : RCB_INFO_COLOR;

  return (
    <section
      className="overflow-hidden rounded-xl border bg-background"
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Megaphone className="size-3.5" style={{ color }} />
        <h2 className="flex-1 text-xs font-semibold tracking-wider uppercase">
          Alerty RCB
        </h2>
        {activeAir > 0 ? (
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-black"
            style={{ backgroundColor: RCB_AIR_COLOR }}
          >
            {activeAir} AKTYWNE
          </span>
        ) : null}
      </div>
      <ul>
        {alerts.slice(0, 5).map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => onSelect(alert.id)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-foreground/5"
            >
              <span
                className={`mt-1 size-2 shrink-0 rounded-full ${isActiveRcbAirAlert(alert) ? "animate-pulse" : ""}`}
                style={{ backgroundColor: alertColor(alert) }}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`line-clamp-2 ${alert.cancelled ? "text-muted-foreground line-through" : ""}`}
                >
                  {alert.message}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {formatIssued(alert)} · {statusLabel(alert)}
                  {alert.regionIds.length > 0
                    ? ` · ${alert.regionIds.map(regionLabel).join(", ")}`
                    : ""}
                </span>
              </span>
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RcbAlertContent({
  alert,
  regionLabel,
  onClose,
}: {
  alert: RcbAlert;
  regionLabel(regionId: string): string;
  onClose?: () => void;
}) {
  const color = alertColor(alert);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: color }}
        >
          <Megaphone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            Alert RCB · {alert.source === "rso" ? "RSO" : "gov.pl/rcb"}
          </p>
          <h2 className="leading-tight font-semibold">{alert.title}</h2>
          <p className="mt-1 text-sm" style={{ color }}>
            {formatIssued(alert)} · {statusLabel(alert)}
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

      <blockquote
        className="rounded-xl border-l-4 bg-muted/40 px-3.5 py-3 text-sm leading-relaxed"
        style={{ borderColor: color }}
      >
        {alert.message}
      </blockquote>

      {alert.details !== null && alert.details !== alert.message ? (
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {alert.details}
        </p>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Województwa</dt>
        <dd>
          {alert.regionIds.length > 0
            ? alert.regionIds.map(regionLabel).join(", ")
            : "nie podano"}
        </dd>
        {alert.validTo === null ? null : (
          <>
            <dt className="text-muted-foreground">Ważny do</dt>
            <dd>{timeFormat.format(new Date(alert.validTo))}</dd>
          </>
        )}
      </dl>

      {alert.url === null ? null : (
        <Button variant="outline" asChild>
          <a href={alert.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Komunikat na gov.pl
          </a>
        </Button>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Treść z Regionalnego Systemu Ostrzegania i serwisu RCB. Alert RCB
        dotyczący zagrożenia z powietrza zaznacza województwo na żółto, dopóki
        nie zostanie odwołany.
      </p>
    </div>
  );
}
