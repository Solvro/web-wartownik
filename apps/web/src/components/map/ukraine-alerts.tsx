"use client";

import type { UkraineAlert } from "@wartownik/shared/types/ukraine-alerts";
import {
  UKRAINE_ALERT_VISUALS,
  translateAlertReason,
} from "@wartownik/shared/ukraine-alerts";
import { Siren, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function UkraineAlertsToggle({
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
        htmlFor="ua-alerts"
        className="flex cursor-pointer items-center gap-3"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            color: enabled ? "#fff" : "#dc2626",
            backgroundColor: enabled
              ? "#dc2626"
              : "color-mix(in srgb, #dc2626 14%, transparent)",
          }}
        >
          <Siren className="size-4" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Alarmy w Ukrainie</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">
            Oficjalne alarmy powietrzne w obwodach i rejonach
          </span>
        </span>
        {enabled && count !== undefined ? (
          <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            {count}
          </span>
        ) : null}
        <Switch
          id="ua-alerts"
          checked={enabled}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-blue-600"
        />
      </label>
      {enabled ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {Object.values(UKRAINE_ALERT_VISUALS).map((visual) => (
            <li
              key={visual.label}
              className="flex items-center gap-1.5 rounded-full border bg-background/70 py-0.5 pr-2 pl-1 text-[11px]"
            >
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: visual.color }}
              />
              {visual.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function UkraineAlertContent({
  title,
  alert,
  onClose,
}: {
  title: string;
  alert: UkraineAlert;
  onClose?: () => void;
}) {
  const visual = UKRAINE_ALERT_VISUALS[alert.level];
  const reasons = [...new Set(alert.reasons.map(translateAlertReason))];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: visual.color }}
        >
          <Siren className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            Alarm powietrzny w Ukrainie
          </p>
          <h2 className="leading-tight font-semibold">{title}</h2>
          <p className="mt-1 text-sm" style={{ color: visual.color }}>
            Od {timeFormat.format(new Date(alert.since))} · {visual.label}
            {reasons.length > 0 ? ` · ${reasons.join(", ")}` : ""}
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
      <p className="text-xs leading-relaxed text-muted-foreground">
        Oficjalny alarm ogłoszony w Ukrainie, pokazany informacyjnie – nie
        wpływa na status polskich województw. Źródło: NEPTUN.
      </p>
    </div>
  );
}
