import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

const POLISH_NAME: ExpressionSpecification = [
  "coalesce",
  ["get", "name:pl"],
  ["get", "name:latin"],
  ["get", "name"],
];

const HIDDEN_LAYER = /place_state|label_state|state_label|admin_1/;

function localizeLayer(layer: LayerSpecification): LayerSpecification {
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

export function localizeStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.map(localizeLayer) };
}
