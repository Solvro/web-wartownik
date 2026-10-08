import { isActiveRcbAirAlert } from "@wartownik/shared/regions";
import type { RcbAlert } from "@wartownik/shared/types/rcb-alerts";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { regionName } from "@/lib/regions";
import { colors, radius } from "@/lib/theme";

const RCB_AIR_COLOR = "#EAB308";

const dayFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
});
const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function meta(alert: RcbAlert) {
  const issued = (
    alert.issuedAtPrecision === "day" ? dayFormat : timeFormat
  ).format(new Date(alert.issuedAt));
  const status = alert.air
    ? alert.cancelled
      ? "odwołany"
      : "zagrożenie z powietrza"
    : "komunikat";
  const regions = alert.regionIds.map(regionName).join(", ");
  return [issued, status, regions].filter(Boolean).join(" · ");
}

function RcbAlertItem({ alert }: { alert: RcbAlert }) {
  const [expanded, setExpanded] = useState(false);
  const active = isActiveRcbAirAlert(alert);
  return (
    <Pressable
      onPress={() => setExpanded((value) => !value)}
      style={styles.item}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: active ? RCB_AIR_COLOR : colors.textMuted },
        ]}
      />
      <View style={styles.body}>
        <Text
          style={[styles.message, alert.cancelled && styles.cancelled]}
          numberOfLines={expanded ? undefined : 2}
        >
          {alert.message}
        </Text>
        {expanded && alert.details !== null ? (
          <Text style={styles.details}>{alert.details}</Text>
        ) : null}
        <Text style={styles.meta}>{meta(alert)}</Text>
        {expanded && alert.url !== null ? (
          <Text
            style={styles.link}
            onPress={() => void Linking.openURL(alert.url as string)}
          >
            Komunikat na gov.pl
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function RcbAlerts({ alerts }: { alerts: RcbAlert[] }) {
  if (alerts.length === 0) {
    return null;
  }
  const activeAir = alerts.filter(isActiveRcbAirAlert).length;
  return (
    <View
      style={[
        styles.card,
        activeAir > 0 && { borderColor: "rgba(234,179,8,0.5)" },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>ALERTY RCB</Text>
        {activeAir > 0 ? (
          <Text style={styles.badge}>{activeAir} AKTYWNE</Text>
        ) : null}
      </View>
      {alerts.slice(0, 5).map((alert) => (
        <RcbAlertItem key={alert.id} alert={alert} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  badge: {
    overflow: "hidden",
    borderRadius: 6,
    backgroundColor: RCB_AIR_COLOR,
    color: "#000",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  item: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  body: { flex: 1, gap: 4 },
  message: { color: colors.text, fontSize: 13, lineHeight: 18 },
  cancelled: { color: colors.textMuted, textDecorationLine: "line-through" },
  details: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  meta: { color: colors.textMuted, fontSize: 11 },
  link: { color: colors.primary, fontSize: 12, fontWeight: "600" },
});
