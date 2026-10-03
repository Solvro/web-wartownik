import { CloudOff, ServerCrash } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import type { Connectivity } from "@/hooks/use-connectivity";
import { colors } from "@/lib/theme";

const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ConnectivityBanner({
  connectivity,
  updatedAt,
}: {
  connectivity: Connectivity;
  updatedAt: number | undefined;
}) {
  if (connectivity === "online") {
    return null;
  }
  const saved =
    updatedAt === undefined
      ? "brak zapisanych danych"
      : timeFormat.format(updatedAt);
  const offline = connectivity === "no-network";
  return (
    <View style={[styles.banner, offline ? styles.offline : styles.serverDown]}>
      {offline ? (
        <CloudOff size={16} color={colors.text} />
      ) : (
        <ServerCrash size={16} color="#1C1917" />
      )}
      <Text style={[styles.text, !offline && styles.darkText]}>
        {offline
          ? `Brak internetu – pokazuję dane zapisane ${saved}`
          : "Serwer niedostępny – pokazuję zapisane dane"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  offline: { backgroundColor: "#334155" },
  serverDown: { backgroundColor: colors.warning },
  text: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "500" },
  darkText: { color: "#1C1917" },
});
