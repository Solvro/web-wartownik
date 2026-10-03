import {
  REGION_STATUS_VISUALS,
  regionAlertText,
  sortedAlerts,
} from "@wartownik/shared/regions";
import type { RegionState } from "@wartownik/shared/regions";
import { TriangleAlert } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function AlertBar({
  regions,
  onPress,
}: {
  regions: RegionState[];
  onPress(region: RegionState): void;
}) {
  const alerts = sortedAlerts(regions);
  const top = alerts[0];
  if (top === undefined) {
    return null;
  }
  return (
    <Pressable
      onPress={() => onPress(top)}
      style={[
        styles.bar,
        { backgroundColor: REGION_STATUS_VISUALS[top.status].color },
      ]}
    >
      <View style={styles.icon}>
        <TriangleAlert size={16} color="#fff" />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {regionAlertText(top)}
      </Text>
      {alerts.length > 1 ? (
        <Text style={styles.more}>+{alerts.length - 1}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  text: { flex: 1, color: "#fff", fontWeight: "600", fontSize: 13 },
  more: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
