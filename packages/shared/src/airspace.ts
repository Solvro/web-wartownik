const FEET_TO_KM = 0.0003048;

export const NOTABLE_AIRSPACE_TYPES = new Set(["ADHOC", "R", "NPZ", "D"]);

export const AIRSPACE_COLORS = {
  notable: "#f97316",
  routine: "#818cf8",
} as const;

const TYPE_DESCRIPTIONS: Record<string, { name: string; description: string }> =
  {
    TRA: {
      name: "Strefa czasowo wydzielona",
      description:
        "Kawałek nieba wydzielony na czas ćwiczeń lub lotów wojskowych — na ten czas zwykły ruch go omija.",
    },
    TSA: {
      name: "Strefa czasowo zarezerwowana",
      description:
        "Przestrzeń zarezerwowana wyłącznie dla wskazanego użytkownika, najczęściej lotnictwa wojskowego.",
    },
    D: {
      name: "Strefa niebezpieczna",
      description:
        "W tej przestrzeni mogą odbywać się działania niebezpieczne dla lotów, np. strzelania.",
    },
    R: {
      name: "Strefa ograniczeń lotów",
      description: "Loty są tu dozwolone tylko na określonych warunkach.",
    },
    NPZ: {
      name: "Strefa NPZ",
      description: "Specjalna strefa ograniczeń publikowana przez PAŻP.",
    },
    ADHOC: {
      name: "Strefa doraźna",
      description: "Przestrzeń wydzielona doraźnie, poza zwykłym planem.",
    },
    MRT: {
      name: "Wojskowa trasa lotów",
      description: "Korytarz przeznaczony dla lotów wojskowych.",
    },
    ATZ: {
      name: "Strefa ruchu lotniskowego",
      description: "Przestrzeń wokół lotniska.",
    },
  };

export function airspaceTypeInfo(type: string) {
  return (
    TYPE_DESCRIPTIONS[type] ?? {
      name: `Strefa ${type}`,
      description: "Strefa przestrzeni powietrznej publikowana przez PAŻP.",
    }
  );
}

export function formatAltitude(value: string): string {
  const match = value.match(/^([AF])(\d+)$/);
  if (match === null) {
    return value === "GND" ? "ziemia" : value;
  }
  const km = (Number(match[2]) * 100 * FEET_TO_KM).toLocaleString("pl-PL", {
    maximumFractionDigits: 1,
  });
  return `${match[1] === "F" ? "FL" : "A"}${match[2]} (${km} km)`;
}
