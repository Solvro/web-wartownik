"use client";

import { activityHistogram } from "@wartownik/shared/threat-history";
import type { ThreatHistory } from "@wartownik/shared/types/threat-history";
import { History, Pause, Play, SkipForward, X } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export const TIMELINE_RANGES = [6, 24, 48] as const;
export const TIMELINE_SPEEDS = [60, 300, 900] as const;

const BUCKETS = 96;

const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const hourFormat = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
});

const speedLabel = (speed: number) =>
  speed >= 60 ? `${speed / 60} min/s` : `${speed}×`;

export function usePlayback({
  playing,
  speed,
  onTick,
}: {
  playing: boolean;
  speed: number;
  onTick(delta: number): void;
}) {
  const tick = useEffectEvent(onTick);
  useEffect(() => {
    if (!playing) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      tick((now - last) * speed);
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
}

export function Timeline({
  className,
  history,
  isLoading,
  time,
  hours,
  speed,
  playing,
  activeCount,
  onTimeChange,
  onHoursChange,
  onSpeedChange,
  onTogglePlay,
  onClose,
}: {
  className?: string;
  history: ThreatHistory | undefined;
  isLoading: boolean;
  time: number;
  hours: number;
  speed: number;
  playing: boolean;
  activeCount: number;
  onTimeChange(time: number): void;
  onHoursChange(hours: number): void;
  onSpeedChange(speed: number): void;
  onTogglePlay(): void;
  onClose(): void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const histogram = useMemo(
    () => (history === undefined ? [] : activityHistogram(history, BUCKETS)),
    [history],
  );
  const peak = Math.max(1, ...histogram);
  const from = history?.from ?? time;
  const to = history?.to ?? time;
  const progress = to > from ? (time - from) / (to - from) : 1;

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect === undefined || history === undefined) {
      return;
    }
    const ratio = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1,
    );
    onTimeChange(from + ratio * (to - from));
  };

  const ticks = Array.from(
    { length: 5 },
    (_, index) => from + ((to - from) * index) / 4,
  );

  return (
    <div
      className={`rounded-2xl border bg-background/90 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-500">
          <History className="size-4" />
        </span>
        <div className="mr-auto min-w-0">
          <p className="text-xs text-muted-foreground">Historia zagrożeń</p>
          <p className="text-sm font-semibold tabular-nums">
            {timeFormat.format(time)}
            <span className="ml-2 font-normal text-muted-foreground">
              {activeCount === 0
                ? "brak obiektów"
                : `${activeCount} ${activeCount === 1 ? "obiekt" : activeCount < 5 ? "obiekty" : "obiektów"}`}
            </span>
          </p>
        </div>
        {isLoading ? <Spinner /> : null}
        <div className="flex rounded-lg border p-0.5">
          {TIMELINE_RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onHoursChange(range)}
              className={`rounded-md px-2 py-0.5 text-xs ${range === hours ? "bg-muted font-semibold" : "text-muted-foreground"}`}
            >
              {range} h
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border p-0.5">
          {TIMELINE_SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSpeedChange(value)}
              className={`rounded-md px-2 py-0.5 text-xs ${value === speed ? "bg-muted font-semibold" : "text-muted-foreground"}`}
            >
              {speedLabel(value)}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Zamknij historię"
        >
          <X />
        </Button>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <Button
          size="icon"
          className="shrink-0 rounded-full"
          onClick={onTogglePlay}
          disabled={history === undefined}
          aria-label={playing ? "Pauza" : "Odtwórz"}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-0 flex-1">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Czas"
            aria-valuemin={from}
            aria-valuemax={to}
            aria-valuenow={time}
            aria-valuetext={timeFormat.format(time)}
            className="relative h-12 cursor-pointer touch-none select-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              scrub(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                scrub(event);
              }
            }}
            onKeyDown={(event) => {
              const step = (to - from) / BUCKETS;
              if (event.key === "ArrowLeft")
                onTimeChange(Math.max(from, time - step));
              if (event.key === "ArrowRight")
                onTimeChange(Math.min(to, time + step));
            }}
          >
            <div className="absolute inset-x-0 bottom-0 flex h-10 items-end gap-px">
              {histogram.map((count, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-t-[2px] ${index / BUCKETS <= progress ? "bg-red-500/70" : "bg-muted-foreground/25"}`}
                  style={{
                    height: `${count === 0 ? 2 : 12 + (count / peak) * 88}%`,
                  }}
                />
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
              style={{ left: `${progress * 100}%` }}
            >
              <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-foreground" />
            </div>
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
            {ticks.map((tick, index) => (
              <span key={index}>{hourFormat.format(tick)}</span>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onTimeChange(to)}
          disabled={history === undefined}
        >
          <SkipForward />
          Teraz
        </Button>
      </div>
    </div>
  );
}

export function TimelineButton({ onClick }: { onClick(): void }) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={onClick}
    >
      <History />
      Historia tras zagrożeń
    </Button>
  );
}
