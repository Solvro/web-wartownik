type Expression = unknown[];

interface StyleLayer {
  id: string;
  type: string;
  layout?: Record<string, unknown>;
}

interface Style {
  layers: StyleLayer[];
}

export const BASE_MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const POLISH_NAME: Expression = [
  "coalesce",
  ["get", "name:pl"],
  ["get", "name:latin"],
  ["get", "name"],
];

const HIDDEN_LAYER = /place_state|label_state|state_label|admin_1/;

function localizeLayer<L extends StyleLayer>(layer: L): L {
  if (layer.type !== "symbol") {
    return layer;
  }
  if (HIDDEN_LAYER.test(layer.id)) {
    return { ...layer, layout: { ...layer.layout, visibility: "none" } };
  }
  const textField = layer.layout?.["text-field"];
  if (textField !== undefined && JSON.stringify(textField).includes("name")) {
    return { ...layer, layout: { ...layer.layout, "text-field": POLISH_NAME } };
  }
  return layer;
}

export function localizeStyle<S extends Style>(style: S): S {
  return { ...style, layers: style.layers.map(localizeLayer) };
}
