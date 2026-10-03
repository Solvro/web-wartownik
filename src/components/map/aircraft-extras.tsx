"use client";

import { Camera, Route } from "lucide-react";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { useAircraftDetails } from "@/hooks/use-aircraft-details";

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function AircraftExtras({ hex }: { hex: string }) {
  const { data, isLoading } = useAircraftDetails(hex);

  if (isLoading) {
    return <Skeleton className="aspect-[16/10] w-full rounded-xl" />;
  }
  if (data === undefined) {
    return null;
  }

  const first = data.track[0];
  const last = data.track.at(-1);

  return (
    <div className="flex flex-col gap-2">
      {data.photo === null ? (
        <div className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs text-muted-foreground">
          <Camera className="size-5" />
          Brak zdjęcia tej maszyny
        </div>
      ) : (
        <figure className="overflow-hidden rounded-xl border bg-muted">
          <a href={data.photo.link} target="_blank" rel="noreferrer">
            <Image
              src={data.photo.src}
              width={data.photo.width}
              height={data.photo.height}
              alt={data.description ?? "Zdjęcie samolotu"}
              className="aspect-[16/10] w-full object-cover"
              sizes="380px"
            />
          </a>
          <figcaption className="px-3 py-1.5 text-[11px] text-muted-foreground">
            Fot. {data.photo.photographer} ·{" "}
            <a
              href={data.photo.link}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              planespotters.net
            </a>
          </figcaption>
        </figure>
      )}
      {data.description === null ? null : (
        <p className="text-sm font-medium">{data.description}</p>
      )}
      {first === undefined || last === undefined ? null : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Route className="size-3.5" />
          Trasa z ostatnich {formatDuration(
            last.timestamp - first.timestamp,
          )}{" "}
          widoczna na mapie
        </p>
      )}
    </div>
  );
}
