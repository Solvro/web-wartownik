import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange(value: T): void;
}) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable
          key={String(option.value)}
          onPress={() => onChange(option.value)}
          style={[styles.option, option.value === value && styles.active]}
        >
          <Text
            style={[styles.label, option.value === value && styles.activeLabel]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 3,
  },
  option: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  active: { backgroundColor: colors.primary },
  label: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  activeLabel: { color: "#fff" },
});
