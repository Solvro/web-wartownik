import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  FillLayerSpecification,
  HeatmapLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

import { LAYER_VISUALS } from "@/config/layer-visuals";
import { LAYER_CONFIG } from "@/config/layers";
import { REGION_STATUS_VISUALS } from "@/lib/regions";

import { CLUSTERED_LAYERS } from "./features";

export const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export const FONT_REGULAR = ["Noto Sans Regular"];
export const FONT_BOLD = ["Noto Sans Bold"];

const clusterSlugs = CLUSTERED_LAYERS.map((layer) => LAYER_CONFIG[layer].slug);

export const CLUSTER_PROPERTIES = Object.fromEntries([
  ["total", ["+", ["get", "w"]]],
  ...clusterSlugs.map((slug) => [
    `s_${slug}`,
    ["+", ["case", ["==", ["get", "layer"], slug], ["get", "w"], 0]],
  ]),
]) as Record<string, ExpressionSpecification>;

const layerSum = (slug: string): ExpressionSpecification => [
  "coalesce",
  ["get", `s_${slug}`],
  0,
];

const maxSum = [
  "max",
  ...clusterSlugs.map(layerSum),
] as unknown as ExpressionSpecification;

const dominantColor = [
  "case",
  ...CLUSTERED_LAYERS.flatMap((layer) => [
    ["==", layerSum(LAYER_CONFIG[layer].slug), maxSum],
    LAYER_VISUALS[layer].color,
  ]),
  "#64748b",
] as unknown as ExpressionSpecification;

export const IS_CLUSTER: ExpressionSpecification = [
  "any",
  ["has", "point_count"],
  ["==", ["get", "kind"], "server"],
];

export function clusterCircle(
  dark: boolean,
): Omit<CircleLayerSpecification, "id" | "source"> {
  return {
    type: "circle",
    filter: IS_CLUSTER,
    paint: {
      "circle-color": dark ? "#0b1120" : "#ffffff",
      "circle-opacity": 0.92,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "total"],
        2,
        11,
        100,
        14,
        1000,
        17,
        10000,
        21,
      ],
      "circle-stroke-width": 2.5,
      "circle-stroke-color": dominantColor,
    },
  };
}

export const clusterGlow: Omit<CircleLayerSpecification, "id" | "source"> = {
  type: "circle",
  filter: IS_CLUSTER,
  paint: {
    "circle-color": dominantColor,
    "circle-opacity": 0.18,
    "circle-blur": 0.4,
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "total"],
      2,
      15,
      100,
      19,
      1000,
      23,
      10000,
      28,
    ],
  },
};

export function clusterCount(
  dark: boolean,
): Omit<SymbolLayerSpecification, "id" | "source"> {
  return {
    type: "symbol",
    filter: IS_CLUSTER,
    layout: {
      "text-field": [
        "case",
        [">=", ["get", "total"], 10000],
        [
          "concat",
          ["to-string", ["round", ["/", ["get", "total"], 1000]]],
          "k",
        ],
        [">=", ["get", "total"], 1000],
        [
          "concat",
          [
            "number-format",
            ["/", ["floor", ["/", ["get", "total"], 100]], 10],
            { locale: "pl-PL", "max-fraction-digits": 1 },
          ],
          "k",
        ],
        ["to-string", ["get", "total"]],
      ],
      "text-font": FONT_BOLD,
      "text-size": 11,
      "text-allow-overlap": true,
    },
    paint: { "text-color": dark ? "#f8fafc" : "#0f172a" },
  };
}

export const markerSymbol = (
  filter?: ExpressionSpecification,
): Omit<SymbolLayerSpecification, "id" | "source"> => ({
  type: "symbol",
  ...(filter === undefined ? {} : { filter }),
  layout: {
    "icon-image": ["get", "img"],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "symbol-sort-key": ["case", ["get", "pulse"], 2, 1],
  },
  paint: {
    "icon-opacity": ["case", ["get", "dimmed"], 0.55, 1],
  },
});

export const arrowSymbol: Omit<SymbolLayerSpecification, "id" | "source"> = {
  type: "symbol",
  filter: ["has", "heading"],
  layout: {
    "icon-image": ["get", "arrow"],
    "icon-rotate": ["get", "heading"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
  paint: { "icon-opacity": ["case", ["get", "dimmed"], 0.55, 1] },
};

export const pulseCircle: Omit<CircleLayerSpecification, "id" | "source"> = {
  type: "circle",
  filter: ["==", ["get", "pulse"], true],
  paint: {
    "circle-color": ["get", "color"],
    "circle-radius": 15,
    "circle-opacity": 0.4,
  },
};

export const selectionRing: Omit<CircleLayerSpecification, "id" | "source"> = {
  type: "circle",
  paint: {
    "circle-radius": 21,
    "circle-color": "rgba(0,0,0,0)",
    "circle-stroke-width": 3,
    "circle-stroke-color": "#3b82f6",
  },
};

export const zoneFill: Omit<FillLayerSpecification, "id" | "source"> = {
  type: "fill",
  filter: ["==", ["geometry-type"], "Polygon"],
  paint: {
    "fill-color": ["get", "color"],
    "fill-opacity": ["case", ["get", "dimmed"], 0.06, 0.14],
  },
};

export const zoneOutline: Omit<LineLayerSpecification, "id" | "source"> = {
  type: "line",
  paint: {
    "line-color": ["get", "color"],
    "line-width": 1.6,
    "line-dasharray": [2, 2],
    "line-opacity": ["case", ["get", "dimmed"], 0.45, 0.9],
  },
};

export const smogHalo: Omit<CircleLayerSpecification, "id" | "source"> = {
  type: "circle",
  paint: {
    "circle-color": ["get", "color"],
    "circle-opacity": 0.22,
    "circle-blur": 0.85,
    "circle-radius": [
      "interpolate",
      ["exponential", 2],
      ["zoom"],
      5,
      8,
      13,
      2000,
    ],
  },
};

export const firesHeatmap: Omit<HeatmapLayerSpecification, "id" | "source"> = {
  type: "heatmap",
  maxzoom: 9,
  paint: {
    "heatmap-weight": ["/", ["get", "intensity"], 3],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 9, 2],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 9, 22],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.85, 9, 0],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(245,158,11,0)",
      0.2,
      "rgba(245,158,11,0.55)",
      0.5,
      "#ea580c",
      1,
      "#b91c1c",
    ],
  },
};

const regionColor = [
  "match",
  ["get", "status"],
  "threat",
  REGION_STATUS_VISUALS.threat.color,
  "approaching",
  REGION_STATUS_VISUALS.approaching.color,
  "watch",
  REGION_STATUS_VISUALS.watch.color,
  REGION_STATUS_VISUALS.none.color,
] as unknown as ExpressionSpecification;

function regionOpacity(dark: boolean, scale: number): ExpressionSpecification {
  return [
    "match",
    ["get", "status"],
    "threat",
    0.32 * scale,
    "approaching",
    0.24 * scale,
    "watch",
    0.15 * scale,
    ["case", ["==", ["get", "country"], "PL"], (dark ? 0.05 : 0.04) * scale, 0],
  ];
}

export function regionFill(
  dark: boolean,
): Omit<FillLayerSpecification, "id" | "source"> {
  return {
    type: "fill",
    paint: {
      "fill-color": regionColor,
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        regionOpacity(dark, 1),
        9,
        regionOpacity(dark, 0.45),
        12,
        regionOpacity(dark, 0.15),
      ],
    },
  };
}

export const regionHoverFill: Omit<FillLayerSpecification, "id" | "source"> = {
  type: "fill",
  paint: { "fill-color": "#3b82f6", "fill-opacity": 0.08 },
};

export function regionLine(
  dark: boolean,
): Omit<LineLayerSpecification, "id" | "source"> {
  return {
    type: "line",
    paint: {
      "line-color": [
        "case",
        ["==", ["get", "status"], "none"],
        dark ? "rgba(148,163,184,0.45)" : "rgba(71,85,105,0.4)",
        regionColor,
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        ["case", ["==", ["get", "status"], "none"], 0.6, 2],
        9,
        ["case", ["==", ["get", "status"], "none"], 1.4, 3],
      ],
    },
  };
}

export function polandOutline(
  dark: boolean,
): Omit<LineLayerSpecification, "id" | "source"> {
  return {
    type: "line",
    paint: {
      "line-color": dark ? "#60a5fa" : "#2563eb",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.4, 9, 2.6],
      "line-opacity": 0.85,
    },
  };
}

export function polandGlow(
  dark: boolean,
): Omit<LineLayerSpecification, "id" | "source"> {
  return {
    type: "line",
    paint: {
      "line-color": dark ? "#3b82f6" : "#60a5fa",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 6, 9, 12],
      "line-blur": 6,
      "line-opacity": 0.35,
    },
  };
}

export function regionLabel(
  dark: boolean,
): Omit<SymbolLayerSpecification, "id" | "source"> {
  return {
    type: "symbol",
    minzoom: 4.5,
    maxzoom: 9,
    layout: {
      "text-field": ["upcase", ["get", "label"]],
      "text-font": FONT_REGULAR,
      "text-size": ["interpolate", ["linear"], ["zoom"], 4.5, 8, 8, 12],
      "text-letter-spacing": 0.12,
      "text-max-width": 8,
    },
    paint: {
      "text-color": dark ? "rgba(203,213,225,0.7)" : "rgba(51,65,85,0.65)",
      "text-halo-color": dark ? "rgba(2,6,23,0.8)" : "rgba(255,255,255,0.85)",
      "text-halo-width": 1.2,
    },
  };
}

export const userHalo: Omit<CircleLayerSpecification, "id" | "source"> = {
  type: "circle",
  paint: {
    "circle-radius": 18,
    "circle-color": "#3b82f6",
    "circle-opacity": 0.2,
  },
};

export const userDot: Omit<CircleLayerSpecification, "id" | "source"> = {
  type: "circle",
  paint: {
    "circle-radius": 7,
    "circle-color": "#2563eb",
    "circle-stroke-width": 3,
    "circle-stroke-color": "#ffffff",
  },
};

const HISTORY_COLOR = "#22d3ee";

export function historyCasing(
  dark: boolean,
): Omit<LineLayerSpecification, "id" | "source"> {
  return {
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": dark ? "#020617" : "#ffffff",
      "line-width": 5,
      "line-opacity": 0.6,
    },
  };
}

export const historyLine: Omit<LineLayerSpecification, "id" | "source"> = {
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-width": 2.5,
    "line-gradient": [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      "rgba(34,211,238,0.15)",
      1,
      HISTORY_COLOR,
    ],
  },
};
