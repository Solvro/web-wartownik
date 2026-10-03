import { conjugateNumeric } from "@wartownik/shared/geo/numerals";
import { Layer } from "@wartownik/shared/types/layers";
import type { LayerPoint } from "@wartownik/shared/types/layers";
import { Image } from "expo-image";
import { Camera, Route } from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAircraftDetails, useThreatTrack } from "@/hooks/use-selected-track";
import { colors, radius } from "@/lib/theme";

function formatSpan(fromMs: number, toMs: number): string {
  const minutes = Math.max(1, Math.round((toMs - fromMs) / 60000));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const rest = minutes % 60;
  return rest === 0
    ? `${Math.floor(minutes / 60)} h`
    : `${Math.floor(minutes / 60)} h ${rest} min`;
}

function AircraftExtras({ point }: { point: LayerPoint }) {
  const { data, isLoading } = useAircraftDetails(point);
  if (isLoading) {
    return <ActivityIndicator color={colors.primary} />;
  }
  if (data === undefined) {
    return null;
  }
  const first = data.track[0];
  const last = data.track.at(-1);
  return (
    <View style={styles.container}>
      {data.photo === null ? (
        <View style={styles.noPhoto}>
          <Camera color={colors.textMuted} size={20} />
          <Text style={styles.muted}>Brak zdjęcia tej maszyny</Text>
        </View>
      ) : (
        <View style={styles.photoCard}>
          <Image
            source={{ uri: data.photo.src }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
          />
          <Text style={styles.credit}>
            Fot. {data.photo.photographer} ·{" "}
            <Text
              style={styles.link}
              onPress={() =>
                void Linking.openURL(
                  data.photo?.link ?? "https://www.planespotters.net",
                )
              }
            >
              planespotters.net
            </Text>
          </Text>
        </View>
      )}
      {data.description === null ? null : (
        <Text style={styles.model}>{data.description}</Text>
      )}
      {first !== undefined && last !== undefined ? (
        <View style={styles.row}>
          <Route color={colors.textMuted} size={14} />
          <Text style={styles.muted}>
            Trasa z ostatnich {formatSpan(first.timestamp, last.timestamp)}{" "}
            widoczna na mapie
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ThreatTrackInfo({ point }: { point: LayerPoint }) {
  const { data } = useThreatTrack(point);
  if (data === undefined) {
    return null;
  }
  const first = data[0];
  const last = data.at(-1);
  return (
    <View style={styles.row}>
      <Route color={colors.textMuted} size={14} />
      <Text style={styles.muted}>
        {data.length < 2 || first === undefined || last === undefined
          ? "Przebyta trasa pojawi się po kolejnych meldunkach."
          : `Przebyta trasa: ${data.length} ${conjugateNumeric(data.length, "meldun", "ek", "ki", "ków")} z ostatnich ${formatSpan(first.timestamp, last.timestamp)}`}
      </Text>
    </View>
  );
}

export function TrackExtras({ point }: { point: LayerPoint }) {
  if (point.layer === Layer.Aircraft) {
    return <AircraftExtras point={point} />;
  }
  if (point.layer === Layer.Drones && point.meta.demo !== true) {
    return <ThreatTrackInfo point={point} />;
  }
  return null;
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  photoCard: {
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  photo: { width: "100%", aspectRatio: 16 / 10 },
  credit: {
    color: colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  link: { color: colors.primary, textDecorationLine: "underline" },
  noPhoto: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  model: { color: colors.text, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  muted: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
});
