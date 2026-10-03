import { Tabs } from "expo-router/js-tabs";
import { Map, Settings, ShieldHalf } from "lucide-react-native";

import { AlertWatcher } from "@/components/alert-watcher";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <>
      <AlertWatcher />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Mapa",
            tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="region"
          options={{
            title: "Mój region",
            tabBarIcon: ({ color, size }) => (
              <ShieldHalf color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ustawienia",
            tabBarIcon: ({ color, size }) => (
              <Settings color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
