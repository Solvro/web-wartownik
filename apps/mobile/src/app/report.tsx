import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_EVENT_TYPES,
  REPORT_EVENT_TYPE_LABELS,
} from "@defensownik/shared/config/reports";
import type { ReportEventType } from "@defensownik/shared/config/reports";
import type { ReportFormValues } from "@defensownik/shared/schemas/report";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useUserLocation } from "@/hooks/use-user-location";
import { queryClient } from "@/lib/query-client";
import { REPORT_MUTATION_KEY } from "@/lib/report-queue";
import { colors, radius } from "@/lib/theme";

export default function ReportScreen() {
  const { location, refresh } = useUserLocation();
  const [type, setType] = useState<ReportEventType>("drone");
  const [description, setDescription] = useState("");
  const report = useMutation<unknown, Error, ReportFormValues>({
    mutationKey: REPORT_MUTATION_KEY,
  });

  const submit = async () => {
    const position = location ?? (await refresh());
    if (position === null) {
      Alert.alert(
        "Brak lokalizacji",
        "Zgłoszenie potrzebuje Twojej lokalizacji.",
      );
      return;
    }
    report.mutate(
      {
        reportEventType: type,
        description,
        lat: position.lat,
        lng: position.lng,
      },
      {
        onSuccess: () =>
          void queryClient.invalidateQueries({ queryKey: [["layers", "get"]] }),
      },
    );
    Alert.alert(
      "Zgłoszenie przyjęte",
      !onlineManager.isOnline()
        ? "Brak internetu – wyślemy je automatycznie po odzyskaniu połączenia."
        : "Dziękujemy. Zgłoszenie pojawi się na mapie.",
    );
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Rodzaj wydarzenia</Text>
      <View style={styles.types}>
        {REPORT_EVENT_TYPES.map((value) => (
          <Pressable
            key={value}
            onPress={() => setType(value)}
            style={[styles.type, value === type && styles.typeActive]}
          >
            <Text
              style={[styles.typeText, value === type && styles.typeTextActive]}
            >
              {REPORT_EVENT_TYPE_LABELS[value]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Opis</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
        multiline
        placeholder="Krótki opis tego co zobaczyłeś"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.counter}>
        {description.length}/{REPORT_DESCRIPTION_MAX_LENGTH} znaków
      </Text>

      <Text style={styles.muted}>
        {location === null
          ? "Lokalizacja zostanie pobrana z GPS przy wysyłce."
          : `Lokalizacja: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
      </Text>
      <Text style={styles.muted}>
        Zgłoszenia są anonimowe i widoczne na mapie. W nagłych wypadkach dzwoń
        pod 112.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => void submit()}
        disabled={report.isPending && !report.isPaused}
      >
        {report.isPending && !report.isPaused ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Wyślij zgłoszenie</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10 },
  label: { color: colors.text, fontWeight: "600", marginTop: 6 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.textMuted, fontWeight: "500" },
  typeTextActive: { color: "#fff" },
  input: {
    minHeight: 120,
    textAlignVertical: "top",
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  counter: { color: colors.textMuted, fontSize: 12, textAlign: "right" },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  button: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
