"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { useDebounce } from "react-use";

import { useMap } from "@/hooks/use-map";
import { cn } from "@/lib/utils";
import type { GeocodeResult } from "@/types/geocode";

const DEBOUNCE_MS = 250;

export function SearchBox({ className }: { className?: string }) {
  const { flyTo, fitBounds } = useMap();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useDebounce(() => setDebounced(query.trim()), DEBOUNCE_MS, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["geocode", debounced],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/geocode?${new URLSearchParams({ q: debounced })}`,
        { signal },
      );
      const body = (await response.json()) as { results?: GeocodeResult[] };
      return body.results ?? [];
    },
    enabled: debounced.length >= 2,
    staleTime: Infinity,
  });
  const results = debounced.length >= 2 ? (data ?? []) : [];
  const showList = open && query.trim().length >= 2;

  const select = (result: GeocodeResult) => {
    if (result.bounds === null) {
      flyTo(result, 15);
    } else {
      fitBounds(result.bounds);
    }
    setQuery(result.label);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const result = results[active];
      if (result !== undefined) {
        event.preventDefault();
        select(result);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex h-10 items-center gap-2 rounded-xl border bg-muted/60 px-3 transition-colors focus-within:border-blue-500/60 focus-within:bg-background">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Szukaj miejsca lub adresu"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {isFetching ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : query === "" ? null : (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Wyczyść"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              {isFetching || debounced !== query.trim()
                ? "Szukam…"
                : "Nie znaleziono lokalizacji"}
            </li>
          ) : (
            results.map((result, index) => (
              <li
                key={`${result.lat},${result.lng},${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(result)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2",
                  index === active && "bg-accent",
                )}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {result.label}
                  </span>
                  {result.context ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {result.context}
                    </span>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
