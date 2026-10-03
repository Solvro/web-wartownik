import { haversineDistance } from "@defensownik/shared/geo/geo";
import { formatDistance } from "@defensownik/shared/presentation/format";
import type { Coordinates } from "@defensownik/shared/types/map";
import * as Location from "expo-location";
import { Navigation2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

function bearing(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function ShelterCompass({
  target,
  label,
}: {
  target: Coordinates;
  label: string;
}) {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    let positionSub: Location.LocationSubscription | undefined;
    let headingSub: Location.LocationSubscription | undefined;
    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        return;
      }
      positionSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        ({ coords }) =>
          setPosition({ lat: coords.latitude, lng: coords.longitude }),
      );
      headingSub = await Location.watchHeadingAsync(
        ({ trueHeading, magHeading }) =>
          setHeading(trueHeading >= 0 ? trueHeading : magHeading),
      );
    })();
    return () => {
      positionSub?.remove();
      headingSub?.remove();
    };
  }, []);

  if (position === null) {
    return null;
  }
  const rotation = bearing(position, target) - (heading ?? 0);
  return (
    <View style={styles.card}>
      <View
        style={[styles.arrow, { transform: [{ rotate: `${rotation}deg` }] }]}
      >
        <Navigation2 size={44} color={colors.success} fill={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.caption}>Kierunek do najbliższego schronu</Text>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.distance}>
          {formatDistance(haversineDistance(position, target))}
        </Text>
        {heading === null ? (
          <Text style={styles.caption}>
            Kompas niedostępny – strzałka wskazuje północ mapy.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22,163,74,0.12)",
  },
  caption: { color: colors.textMuted, fontSize: 12 },
  label: { color: colors.text, fontWeight: "600", marginTop: 2 },
  distance: {
    color: colors.success,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
});
