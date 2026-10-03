"use client";

import { useTheme } from "next-themes";

import { COUNTRY_COLORS } from "@/lib/map/styles";

export function BorderLegend() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <div className="flex items-center gap-3 px-1 text-[11px] text-muted-foreground">
      <span>Granice:</span>
      {Object.values(COUNTRY_COLORS).map((country) => (
        <span key={country.label} className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-3.5 rounded-full"
            style={{ backgroundColor: country[theme] }}
          />
          {country.label}
        </span>
      ))}
    </div>
  );
}
