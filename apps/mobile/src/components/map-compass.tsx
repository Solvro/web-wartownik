import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/lib/theme";

export function MapCompass({
  bearing,
  onPress,
}: {
  bearing: number;
  onPress(): void;
}) {
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Obróć mapę na północ"
    >
      <View style={{ transform: [{ rotate: `${-bearing}deg` }] }}>
        <Svg width={26} height={26} viewBox="0 0 26 26">
          <Path d="M13 2 L17.5 13 L8.5 13 Z" fill="#EF4444" />
          <Path d="M13 24 L8.5 13 L17.5 13 Z" fill={colors.textMuted} />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.92)",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
