import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";

const POLISH_NAME: ExpressionSpecification = [
  "coalesce",
  ["get", "name:pl"],
  ["get", "name:latin"],
  ["get", "name"],
];

const HIDDEN_LAYER = /place_state|label_state|state_label|admin_1/;

export function localizeBaseStyle(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol") {
      continue;
    }
    if (HIDDEN_LAYER.test(layer.id)) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }
    const textField = map.getLayoutProperty(layer.id, "text-field") as unknown;
    if (JSON.stringify(textField ?? null).includes("name")) {
      map.setLayoutProperty(layer.id, "text-field", POLISH_NAME);
    }
  }
}
