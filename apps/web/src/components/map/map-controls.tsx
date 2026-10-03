"use client";

import { POLAND_BOUNDS } from "@wartownik/shared/config/constants";
import { Crosshair, Minus, Plus, Scan } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMap } from "@/hooks/use-map";
import { cn } from "@/lib/utils";

const controlClass =
  "size-10 rounded-none border-0 bg-transparent shadow-none hover:bg-muted";

export function MapControls({ className }: { className?: string }) {
  const { zoomBy, locateUser, isLocating, fitBounds } = useMap();

  const handleLocate = async () => {
    if ((await locateUser()) === null) {
      toast.error("Nie udało się pobrać lokalizacji", {
        description: "Sprawdź, czy przeglądarka ma dostęp do lokalizacji.",
      });
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col overflow-hidden rounded-xl border bg-background/90 shadow-lg backdrop-blur-xl">
        <Button
          variant="ghost"
          className={controlClass}
          onClick={handleLocate}
          disabled={isLocating}
          tooltip="Moja lokalizacja"
          aria-label="Moja lokalizacja"
        >
          {isLocating ? <Spinner /> : <Crosshair />}
        </Button>
        <Button
          variant="ghost"
          className={cn(controlClass, "border-t")}
          onClick={() =>
            fitBounds({
              nw: { lat: POLAND_BOUNDS.north, lng: POLAND_BOUNDS.west },
              se: { lat: POLAND_BOUNDS.south, lng: POLAND_BOUNDS.east },
            })
          }
          tooltip="Cała Polska"
          aria-label="Cała Polska"
        >
          <Scan />
        </Button>
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl border bg-background/90 shadow-lg backdrop-blur-xl">
        <Button
          variant="ghost"
          className={controlClass}
          onClick={() => zoomBy(1)}
          aria-label="Przybliż"
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          className={cn(controlClass, "border-t")}
          onClick={() => zoomBy(-1)}
          aria-label="Oddal"
        >
          <Minus />
        </Button>
      </div>
    </div>
  );
}
