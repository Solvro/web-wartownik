"use client";

import { LAYER_VISUALS } from "@defensownik/shared/config/layer-visuals";
import { LEGEND } from "@defensownik/shared/presentation/legend";
import { LAYERS } from "@defensownik/shared/types/layers";
import type { Layer } from "@defensownik/shared/types/layers";
import { TriangleAlert } from "lucide-react";

import { Icon } from "@/components/icon";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { LayerCounts } from "@/hooks/use-layer-data";
import { useMap } from "@/hooks/use-map";
import { cn } from "@/lib/utils";

const countFormat = new Intl.NumberFormat("pl-PL", { notation: "compact" });

interface LayerListProps {
  counts: LayerCounts;
  loadingLayers: Layer[];
  failedLayers: Layer[];
}

export function LayerList({
  counts,
  loadingLayers,
  failedLayers,
}: LayerListProps) {
  const { enabledLayers, toggleLayer } = useMap();

  return (
    <ul className="flex flex-col gap-1">
      {LAYERS.map((layer) => {
        const { icon, color, description } = LAYER_VISUALS[layer];
        const enabled = enabledLayers[layer];
        const count = counts[layer];
        const loading = enabled && loadingLayers.includes(layer);
        const failed = enabled && failedLayers.includes(layer);
        const switchId = `layer-${LAYERS.indexOf(layer)}`;

        return (
          <li
            key={layer}
            className={cn(
              "rounded-xl border border-transparent transition-colors",
              enabled ? "border-border bg-muted/50" : "hover:bg-muted/40",
            )}
          >
            <label
              htmlFor={switchId}
              className="flex cursor-pointer items-center gap-3 px-2.5 py-2"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-all"
                style={{
                  color: enabled ? "#fff" : color,
                  backgroundColor: enabled
                    ? color
                    : `color-mix(in srgb, ${color} 14%, transparent)`,
                }}
              >
                <Icon name={icon} className="size-4" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {layer}
                  {loading ? <Spinner className="size-3" /> : null}
                  {failed ? (
                    <TriangleAlert className="size-3.5 text-amber-500" />
                  ) : null}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
              {enabled && count !== undefined ? (
                <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                  {countFormat.format(count)}
                </span>
              ) : null}
              <Switch
                id={switchId}
                checked={enabled}
                onCheckedChange={() => toggleLayer(layer)}
                className="data-[state=checked]:bg-blue-600"
              />
            </label>
            {enabled ? (
              <ul className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                {LEGEND[layer].map((entry) => (
                  <li
                    key={entry.label}
                    className="flex items-center gap-1.5 rounded-full border bg-background/70 py-0.5 pr-2 pl-0.5 text-[11px]"
                  >
                    <span
                      className="flex size-4 items-center justify-center rounded-full"
                      style={{ backgroundColor: entry.color }}
                    >
                      <Icon
                        name={entry.icon}
                        className="size-2.5 text-white"
                        strokeWidth={2.5}
                      />
                    </span>
                    {entry.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
