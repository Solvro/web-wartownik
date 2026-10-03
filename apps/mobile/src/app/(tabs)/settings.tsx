import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Segmented } from "@/components/segmented";
import { useUserLocation } from "@/hooks/use-user-location";
import { API_URL } from "@/lib/config";
import {
  requestNotificationPermission,
  syncNotificationSubscription,
} from "@/lib/notifications";
import {
  deleteOfflinePack,
  downloadOfflinePack,
  useOfflinePack,
} from "@/lib/offline-pack";
import { POLISH_REGIONS, regionAt } from "@/lib/regions";
import { getSettings, updateSettings, useSettings } from "@/lib/settings";
import type { AlertThreshold, Settings } from "@/lib/settings";
import { colors, radius } from "@/lib/theme";

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default function SettingsScreen() {
  const settings = useSettings();
  const pack = useOfflinePack();
  const { location, refresh } = useUserLocation();
  const [mode, setMode] = useState<"push" | "local" | null>(null);
  const [downloading, setDownloading] = useState(false);
  const gpsRegion = location === null ? undefined : regionAt(location);

  const apply = async (patch: Partial<Settings>) => {
    updateSettings(patch);
    try {
      const result = await syncNotificationSubscription(getSettings());
      setMode(
        getSettings().notificationsEnabled
          ? result.push
            ? "push"
            : "local"
          : null,
      );
    } catch {
      setMode("local");
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && !(await requestNotificationPermission())) {
      Alert.alert(
        "Brak zgody",
        "Włącz powiadomienia dla Wartownika w ustawieniach telefonu.",
      );
      return;
    }
    const watched =
      enabled &&
      settings.watchedRegionIds.length === 0 &&
      gpsRegion !== undefined
        ? [gpsRegion.properties.id]
        : settings.watchedRegionIds;
    await apply({ notificationsEnabled: enabled, watchedRegionIds: watched });
  };

  const toggleRegion = (id: string) => {
    const watched = settings.watchedRegionIds.includes(id)
      ? settings.watchedRegionIds.filter((item) => item !== id)
      : [...settings.watchedRegionIds, id];
    void apply({ watchedRegionIds: watched });
  };

  const download = async () => {
    const origin = location ?? (await refresh());
    if (origin === null) {
      Alert.alert(
        "Brak lokalizacji",
        "Pakiet offline pobieramy dla Twojej okolicy – włącz lokalizację.",
      );
      return;
    }
    setDownloading(true);
    try {
      await downloadOfflinePack(origin, settings.offlineRadiusKm);
    } catch {
      Alert.alert(
        "Nie udało się pobrać",
        "Sprawdź połączenie z internetem i spróbuj ponownie.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Ustawienia</Text>

        <Text style={styles.section}>Powiadomienia o zagrożeniach</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Alerty dla moich województw</Text>
              <Text style={styles.muted}>
                Powiadomimy Cię, gdy zagrożenie powietrzne zbliży się do
                wybranych województw.
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => void toggleNotifications(value)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
          {settings.notificationsEnabled ? (
            <>
              <Text style={styles.label}>Powiadamiaj od poziomu</Text>
              <Segmented<AlertThreshold>
                value={settings.minStatus}
                onChange={(minStatus) => void apply({ minStatus })}
                options={[
                  { value: "watch", label: "W pobliżu" },
                  { value: "approaching", label: "Zbliża się" },
                  { value: "threat", label: "W regionie" },
                ]}
              />
              <Text style={styles.label}>Obserwowane województwa</Text>
              <View style={styles.chips}>
                {POLISH_REGIONS.map((region) => {
                  const active = settings.watchedRegionIds.includes(
                    region.properties.id,
                  );
                  return (
                    <Pressable
                      key={region.properties.id}
                      onPress={() => toggleRegion(region.properties.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {region.properties.name}
                        {gpsRegion?.properties.id === region.properties.id
                          ? " 📍"
                          : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {mode !== null ? (
                <Text style={styles.muted}>
                  {mode === "push"
                    ? "Powiadomienia push z serwera są aktywne."
                    : "Tryb lokalny: telefon sprawdza status w tle co ok. 15 min i gdy aplikacja jest otwarta."}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        <Text style={styles.section}>Dane offline</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Schrony i AED w mojej okolicy</Text>
          <Text style={styles.muted}>
            Pobierz je teraz – w razie braku sieci aplikacja wskaże najbliższy
            schron z GPS.
          </Text>
          <Text style={styles.label}>Promień</Text>
          <Segmented<10 | 30 | 50>
            value={settings.offlineRadiusKm}
            onChange={(offlineRadiusKm) => updateSettings({ offlineRadiusKm })}
            options={[
              { value: 10, label: "10 km" },
              { value: 30, label: "30 km" },
              { value: 50, label: "50 km" },
            ]}
          />
          {pack !== null ? (
            <Text style={styles.muted}>
              Zapisano {dateFormat.format(new Date(pack.generatedAt))}:{" "}
              {pack.shelters.length} schronów i {pack.aeds.length} AED w
              promieniu {pack.radiusKm} km.
            </Text>
          ) : null}
          <Pressable
            style={styles.primaryButton}
            onPress={() => void download()}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {pack === null
                  ? "Pobierz dane mojej okolicy"
                  : "Odśwież dane okolicy"}
              </Text>
            )}
          </Pressable>
          {pack !== null ? (
            <Pressable onPress={deleteOfflinePack}>
              <Text style={styles.danger}>Usuń dane offline</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.section}>O aplikacji</Text>
        <View style={styles.card}>
          <Text style={styles.muted}>Serwer: {API_URL}</Text>
          <Text style={styles.muted}>
            Źródła: NEPTUN (OSINT), adsb.lol, KG PSP, GIOŚ, IMGW-PIB, NASA
            FIRMS, OpenStreetMap, OpenFreeMap.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 26, fontWeight: "800" },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 10,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  label: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 4 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  danger: {
    color: colors.danger,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 6,
  },
});
