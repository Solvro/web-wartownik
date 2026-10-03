import { SHELTER_AVAILABILITY_VISUALS } from "@defensownik/shared/config/presentation";
import { formatDistance } from "@defensownik/shared/presentation/format";
import {
  REGION_STATUS_VISUALS,
  regionAlertText,
} from "@defensownik/shared/regions";
import { router } from "expo-router";
import { Navigation, ShieldCheck, TriangleAlert } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConnectivityBanner } from "@/components/connectivity-banner";
import { openDirections } from "@/components/point-details";
import { RegionDetails } from "@/components/region-details";
import { ShelterCompass } from "@/components/shelter-compass";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useLiveData } from "@/hooks/use-live-data";
import { useUserLocation } from "@/hooks/use-user-location";
import { nearest, useOfflinePack } from "@/lib/offline-pack";
import { regionAt } from "@/lib/regions";
import { useSettings } from "@/lib/settings";
import { colors, radius } from "@/lib/theme";

export default function RegionScreen() {
  const settings = useSettings();
  const connectivity = useConnectivity();
  const { location } = useUserLocation();
  const pack = useOfflinePack();
  const data = useLiveData(settings.enabledLayers, null);

  const gpsRegion = location === null ? undefined : regionAt(location);
  const regionId = gpsRegion?.properties.id ?? settings.watchedRegionIds[0];
  const region = data.regionStates.find((state) => state.id === regionId);
  const visual =
    region === undefined ? null : REGION_STATUS_VISUALS[region.status];

  const shelters =
    location !== null && pack !== null
      ? nearest(location, pack.shelters, 3)
      : [];
  const aeds =
    location !== null && pack !== null ? nearest(location, pack.aeds, 3) : [];
  const closestShelter = shelters[0];

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Mój region</Text>
        <ConnectivityBanner
          connectivity={connectivity}
          updatedAt={data.updatedAt}
        />

        {region === undefined || visual === null ? (
          <View style={styles.card}>
            <Text style={styles.muted}>
              Włącz lokalizację albo wybierz województwo w ustawieniach, aby
              zobaczyć jego status.
            </Text>
          </View>
        ) : (
          <View style={[styles.statusCard, { borderColor: visual.color }]}>
            <View
              style={[styles.statusIcon, { backgroundColor: visual.color }]}
            >
              {region.status === "none" ? (
                <ShieldCheck color="#fff" size={26} />
              ) : (
                <TriangleAlert color="#fff" size={26} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>
                woj. {region.name}
                {gpsRegion === undefined ? "" : " · z lokalizacji"}
              </Text>
              <Text style={styles.statusText}>
                {region.status === "none"
                  ? "Brak zagrożeń powietrznych"
                  : regionAlertText(region)}
              </Text>
            </View>
          </View>
        )}

        {region !== undefined && region.threats.length > 0 ? (
          <View style={styles.card}>
            <RegionDetails region={region} threats={data.threats} />
          </View>
        ) : null}

        {closestShelter !== undefined ? (
          <ShelterCompass
            target={closestShelter}
            label={closestShelter.meta.address ?? "Punkt schronienia"}
          />
        ) : null}

        <Text style={styles.section}>Najbliższe schrony</Text>
        {pack === null ? (
          <Pressable
            style={styles.card}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.text}>
              Pobierz dane okolicy, aby mieć schrony i AED bez internetu.
            </Text>
            <Text style={styles.link}>Przejdź do ustawień offline →</Text>
          </Pressable>
        ) : location === null ? (
          <View style={styles.card}>
            <Text style={styles.muted}>
              Włącz lokalizację, aby wyznaczyć najbliższe punkty.
            </Text>
          </View>
        ) : (
          shelters.map((shelter) => (
            <View key={shelter.meta.id} style={styles.item}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      SHELTER_AVAILABILITY_VISUALS[shelter.meta.availability]
                        .color,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.text} numberOfLines={2}>
                  {shelter.meta.address ?? "Punkt schronienia"}
                </Text>
                <Text style={styles.muted}>
                  {formatDistance(shelter.distance)} ·{" "}
                  {
                    SHELTER_AVAILABILITY_VISUALS[shelter.meta.availability]
                      .label
                  }
                </Text>
              </View>
              <Pressable
                style={styles.navButton}
                onPress={() => openDirections(shelter)}
              >
                <Navigation size={18} color="#fff" />
              </Pressable>
            </View>
          ))
        )}

        {pack !== null && location !== null ? (
          <>
            <Text style={styles.section}>Najbliższe defibrylatory (AED)</Text>
            {aeds.map((aed, index) => (
              <View key={`${aed.lat},${aed.lng},${index}`} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: "#E11D48" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.text} numberOfLines={2}>
                    {aed.meta.defibrillatorLocation ?? "Defibrylator AED"}
                  </Text>
                  <Text style={styles.muted}>
                    {formatDistance(aed.distance)}
                  </Text>
                </View>
                <Pressable
                  style={styles.navButton}
                  onPress={() => openDirections(aed)}
                >
                  <Navigation size={18} color="#fff" />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.disclaimer}>
          W nagłych wypadkach dzwoń pod 112. Defensownik to nieoficjalne źródło
          dodatkowe – nie zastępuje syren, alertów RCB ani komunikatów służb.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 26, fontWeight: "800" },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  text: { color: colors.text, fontWeight: "500" },
  muted: { color: colors.textMuted, fontSize: 13 },
  link: { color: colors.primary, fontWeight: "600" },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});
