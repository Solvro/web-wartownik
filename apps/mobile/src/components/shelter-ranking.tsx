import { SHELTER_AVAILABILITY_VISUALS } from "@wartownik/shared/config/presentation";
import { formatDistance } from "@wartownik/shared/presentation/format";
import type { RankedShelter } from "@wartownik/shared/shelters";
import { Navigation } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

import { openDirections } from "./point-details";

export function ShelterRanking({ shelters }: { shelters: RankedShelter[] }) {
  return (
    <View style={styles.list}>
      {shelters.map(({ shelter, distanceKm, walkMinutes }, index) => {
        const visual = SHELTER_AVAILABILITY_VISUALS[shelter.meta.availability];
        const best = index === 0;
        return (
          <View
            key={shelter.meta.id}
            style={[styles.item, best && styles.best]}
          >
            <View style={[styles.rank, { backgroundColor: visual.color }]}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {best ? <Text style={styles.badge}>NAJLEPSZY WYBÓR</Text> : null}
              <Text style={styles.title} numberOfLines={2}>
                {shelter.meta.address ?? "Punkt schronienia"}
              </Text>
              <Text style={styles.meta}>
                {formatDistance(distanceKm).replace(" od Ciebie", "")} · ok.{" "}
                {Math.max(1, Math.round(walkMinutes))} min pieszo
              </Text>
              <Text style={[styles.meta, { color: visual.color }]}>
                {visual.label}
              </Text>
            </View>
            <Pressable
              style={styles.navButton}
              onPress={() => openDirections(shelter)}
            >
              <Navigation size={18} color="#fff" />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  best: { borderColor: colors.success, borderWidth: 1.5 },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#fff", fontWeight: "800" },
  badge: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontWeight: "600" },
  meta: { color: colors.textMuted, fontSize: 12 },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
});
