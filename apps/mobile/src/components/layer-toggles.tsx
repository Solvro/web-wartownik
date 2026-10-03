import { LAYER_VISUALS } from "@defensownik/shared/config/layer-visuals";
import { LAYERS } from "@defensownik/shared/types/layers";
import type { Layer } from "@defensownik/shared/types/layers";
import { StyleSheet, Switch, Text, View } from "react-native";

import { updateSettings, useSettings } from "@/lib/settings";
import { colors, radius } from "@/lib/theme";

import { Icon } from "./icon";

export function LayerToggles({ failedLayers }: { failedLayers: Layer[] }) {
  const { enabledLayers } = useSettings();
  return (
    <View style={styles.list}>
      {LAYERS.map((layer) => {
        const { icon, color, description } = LAYER_VISUALS[layer];
        const enabled = enabledLayers[layer];
        return (
          <View key={layer} style={[styles.row, enabled && styles.rowEnabled]}>
            <View
              style={[
                styles.tile,
                { backgroundColor: enabled ? color : `${color}26` },
              ]}
            >
              <Icon
                name={icon}
                size={16}
                color={enabled ? "#fff" : color}
                strokeWidth={2.25}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {layer}
                {failedLayers.includes(layer) ? "  ⚠" : ""}
              </Text>
              <Text style={styles.description} numberOfLines={1}>
                {description}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(value) =>
                updateSettings({
                  enabledLayers: { ...enabledLayers, [layer]: value },
                })
              }
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowEnabled: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: colors.text, fontWeight: "600", fontSize: 14 },
  description: { color: colors.textMuted, fontSize: 12 },
});
