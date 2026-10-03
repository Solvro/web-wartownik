import { LAYER_VISUALS } from "@defensownik/shared/config/layer-visuals";
import { LAYER_CONFIG } from "@defensownik/shared/config/layers";
import type { Layer } from "@defensownik/shared/types/layers";
import { Info, TriangleAlert } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const pill =
  "pointer-events-auto flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-xl";

export function StatusStrip({
  isFetching,
  isLocating,
  failedLayers,
  emptyLayers,
  className,
}: {
  isFetching: boolean;
  isLocating: boolean;
  failedLayers: Layer[];
  emptyLayers: Layer[];
  className?: string;
}) {
  const isLoading = isFetching || isLocating;
  const empty = emptyLayers.map((layer) =>
    LAYER_CONFIG[layer].scope === "global"
      ? `${LAYER_VISUALS[layer].short}: brak aktywnych`
      : `${LAYER_VISUALS[layer].short}: brak w tym obszarze`,
  );

  return (
    <div
      className={cn(
        "pointer-events-none flex flex-col items-center gap-2",
        className,
      )}
    >
      {failedLayers.length > 0 ? (
        <div
          className={cn(
            pill,
            "border-amber-500/40 text-amber-700 dark:text-amber-300",
          )}
        >
          <TriangleAlert className="size-3.5" />
          Nie udało się pobrać: {failedLayers.join(", ")}
        </div>
      ) : null}
      {isLoading ? (
        <div className={pill}>
          <Spinner className="size-3.5" />
          {isLocating ? "Ustalanie lokalizacji…" : "Wczytywanie danych…"}
        </div>
      ) : empty.length > 0 ? (
        <div className={cn(pill, "text-muted-foreground")}>
          <Info className="size-3.5" />
          {empty.join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
