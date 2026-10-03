import { THREAT_VISUALS } from "@defensownik/shared/config/presentation";
import {
  REGION_KIND_LABELS,
  REGION_STATUS_VISUALS,
} from "@defensownik/shared/regions";
import type { RegionState } from "@defensownik/shared/regions";
import type { Layer, LayerLocation } from "@defensownik/shared/types/layers";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

import { Icon } from "./icon";
import { StatusPill } from "./status-pill";

export function RegionDetails({
  region,
  threats,
}: {
  region: RegionState;
  threats: LayerLocation<Layer.Drones>[];
}) {
  const visual = REGION_STATUS_VISUALS[region.status];
  return (
    <View style={styles.container}>
      <Text style={styles.kind}>
        {REGION_KIND_LABELS[region.kind].toUpperCase()}
      </Text>
      <Text style={styles.title}>{region.name}</Text>
      <StatusPill
        color={visual.color}
        label={`${visual.label}${region.etaMinutes === null ? "" : ` · ok. ${region.etaMinutes} min`}`}
      />
      {region.threats.length === 0 ? (
        <Text style={styles.empty}>
          {region.country === "PL"
            ? "W promieniu 50 km od granic województwa nie ma obecnie zgłoszonych zagrożeń powietrznych."
            : "W granicach regionu nie ma obecnie zgłoszonych zagrożeń powietrznych."}
        </Text>
      ) : (
        <View style={styles.list}>
          {region.threats.map((entry) => {
            const threat = threats.find(
              (item) => item.meta.id === entry.threatId,
            );
            if (threat === undefined) {
              return null;
            }
            const type = THREAT_VISUALS[threat.meta.type];
            return (
              <View key={entry.threatId} style={styles.item}>
                <View
                  style={[styles.threatIcon, { backgroundColor: type.color }]}
                >
                  <Icon name={type.icon} size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{type.label}</Text>
                  <Text style={styles.itemMeta}>
                    {entry.distanceKm === 0
                      ? "w granicach regionu"
                      : `${Math.round(entry.distanceKm)} km od granicy`}
                    {entry.etaMinutes === null
                      ? ""
                      : ` · ETA ok. ${entry.etaMinutes} min`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Text style={styles.note}>
        Status liczony z pozycji, kursu i niepewności położenia obiektów z
        agregatora OSINT. To nie jest oficjalny system ostrzegania – kieruj się
        syrenami, alertami RCB i komunikatami służb.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  kind: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  empty: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 14,
    lineHeight: 20,
  },
  list: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: 4,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  threatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { color: colors.text, fontWeight: "600" },
  itemMeta: { color: colors.textMuted, fontSize: 12 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
