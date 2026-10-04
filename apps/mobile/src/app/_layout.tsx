import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  ensureAlertChannel,
  syncNotificationSubscription,
} from "@/lib/notifications";
import { loadOfflineMapStatus } from "@/lib/offline-map";
import { loadOfflinePack } from "@/lib/offline-pack";
import {
  CACHE_MAX_AGE_MS,
  queryClient,
  queryPersister,
} from "@/lib/query-client";
import "@/lib/report-queue";
import { loadSettings } from "@/lib/settings";
import { colors } from "@/lib/theme";
import { TRPCProvider, trpcClient } from "@/lib/trpc";

export default function RootLayout() {
  useEffect(() => {
    void (async () => {
      const settings = await loadSettings();
      await loadOfflinePack();
      void loadOfflineMapStatus().catch(() => undefined);
      await ensureAlertChannel();
      if (settings.notificationsEnabled) {
        await syncNotificationSubscription(settings).catch(() => undefined);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: CACHE_MAX_AGE_MS,
          buster: Constants.expoConfig?.version ?? "1",
        }}
        onSuccess={() => void queryClient.resumePausedMutations()}
      >
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="alert"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="report"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Zgłoś zdarzenie",
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
              }}
            />
          </Stack>
        </TRPCProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
