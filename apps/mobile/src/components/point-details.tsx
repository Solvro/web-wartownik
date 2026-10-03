import { haversineDistance } from "@defensownik/shared/geo/geo";
import { formatDistance } from "@defensownik/shared/presentation/format";
import { isLink, presentPoint } from "@defensownik/shared/presentation/index";
import type { DetailValue } from "@defensownik/shared/presentation/index";
import type { LayerPoint } from "@defensownik/shared/types/layers";
import type { Coordinates } from "@defensownik/shared/types/map";
import { Navigation } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

import { Icon } from "./icon";
import { StatusPill } from "./status-pill";

function Value({ value }: { value: DetailValue }) {
  if (value === null) {
    return (
      <Text style={[styles.value, styles.muted, styles.italic]}>
        brak danych
      </Text>
    );
  }
  if (isLink(value)) {
    return (
      <Text
        style={[styles.value, styles.link]}
        onPress={() => void Linking.openURL(value.href)}
      >
        {value.text}
      </Text>
    );
  }
  return <Text style={styles.value}>{String(value)}</Text>;
}

export function openDirections({ lat, lng }: Coordinates) {
  void Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  );
}

export function PointDetails({
  point,
  userLocation,
}: {
  point: LayerPoint;
  userLocation: Coordinates | null;
}) {
  const { color, icon, title, subtitle, status, details, note, navigable } =
    presentPoint(point);
  const distance =
    navigable === true && userLocation !== null
      ? formatDistance(haversineDistance(userLocation, point))
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: color }]}>
          <Icon name={icon} size={22} color="#fff" strokeWidth={2.25} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.row}>
            {status ? <StatusPill color={color} label={status} /> : null}
            {distance === null ? null : (
              <Text style={styles.muted}>{distance}</Text>
            )}
          </View>
        </View>
      </View>

      {details.length > 0 ? (
        <View style={styles.table}>
          {details.map(({ label, value }) => (
            <View key={label} style={styles.tableRow}>
              <Text style={[styles.label, styles.muted]}>{label}</Text>
              <Value value={value} />
            </View>
          ))}
        </View>
      ) : null}

      {note ? (
        <Text style={styles.note}>
          {note.map((part, index) =>
            isLink(part) ? (
              <Text
                key={index}
                style={styles.link}
                onPress={() => void Linking.openURL(part.href)}
              >
                {part.text}
              </Text>
            ) : (
              <Text key={index}>{part}</Text>
            ),
          )}
        </Text>
      ) : null}

      {navigable ? (
        <Pressable style={styles.button} onPress={() => openDirections(point)}>
          <Navigation size={18} color="#fff" />
          <Text style={styles.buttonText}>Wyznacz trasę</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  header: { flexDirection: "row", gap: 12 },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  table: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 7,
  },
  label: { fontSize: 14 },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  muted: { color: colors.textMuted },
  italic: { fontStyle: "italic", fontWeight: "400" },
  link: { color: colors.primary, textDecorationLine: "underline" },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
