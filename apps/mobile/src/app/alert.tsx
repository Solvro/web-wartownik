import {
  REGION_STATUS_VISUALS,
  regionAlertText,
} from "@wartownik/shared/regions";
import { router } from "expo-router";
import { Phone, TriangleAlert, X } from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShelterCompass } from "@/components/shelter-compass";
import { ShelterRanking } from "@/components/shelter-ranking";
import { useLiveData } from "@/hooks/use-live-data";
import { myRegionState } from "@/hooks/use-my-region";
import { useNearbyShelters } from "@/hooks/use-nearby-shelters";
import { useUserLocation } from "@/hooks/use-user-location";
import { useSettings } from "@/lib/settings";
import { colors, radius } from "@/lib/theme";

export default function AlertScreen() {
  const settings = useSettings();
  const { location } = useUserLocation();
  const data = useLiveData(settings.enabledLayers, null);
  const region = myRegionState(data.regionStates, location, settings);
  const { shelters, source, isLoading } = useNearbyShelters(location);
  const best = shelters[0];
  const color =
    region === undefined || region.status === "none"
      ? colors.danger
      : REGION_STATUS_VISUALS[region.status].color;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <TriangleAlert color="#fff" size={28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Udaj się do schronienia</Text>
          <Text style={styles.headerText}>
            {region !== undefined && region.status !== "none"
              ? regionAlertText(region)
              : "Zagrożenie powietrzne w Twojej okolicy"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Zamknij"
        >
          <X color="#fff" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {best !== undefined ? (
          <ShelterCompass
            target={best.shelter}
            label={best.shelter.meta.address ?? "Punkt schronienia"}
          />
        ) : null}

        <Text style={styles.section}>Najbliższe schrony</Text>
        {location === null ? (
          <Text style={styles.muted}>Ustalanie lokalizacji…</Text>
        ) : isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : shelters.length === 0 ? (
          <Text style={styles.muted}>
            Brak danych o schronach w okolicy. Gdy nie ma schronu – wybierz
            pomieszczenie bez okien, jak najniżej w budynku, oddzielone co
            najmniej dwiema ścianami od zewnątrz.
          </Text>
        ) : (
          <>
            <ShelterRanking shelters={shelters} />
            <Text style={styles.muted}>
              Kolejność uwzględnia dojście pieszo i dostępność: obiekty
              całodobowe są gotowe od razu, udostępniane na żądanie mogą wymagać
              czasu na otwarcie.
              {source === "offline" ? " Dane z pobranej paczki offline." : ""}
            </Text>
          </>
        )}

        <Pressable
          style={styles.call}
          onPress={() => void Linking.openURL("tel:112")}
        >
          <Phone color="#fff" size={18} />
          <Text style={styles.callText}>Zadzwoń 112</Text>
        </Pressable>
        <Text style={styles.muted}>
          Wartownik to nieoficjalne źródło dodatkowe – kieruj się syrenami,
          alertami RCB i komunikatami służb.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    margin: 12,
    borderRadius: radius.lg,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerText: { color: "#fff", fontSize: 14, marginTop: 2 },
  content: { paddingHorizontal: 12, paddingBottom: 32, gap: 12 },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  call: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: 8,
  },
  callText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
