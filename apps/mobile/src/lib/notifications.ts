import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  REGION_STATUS_RANK,
  computeRegionStates,
  regionAlertText,
} from "@wartownik/shared/regions";
import type { RegionState, RegionStatus } from "@wartownik/shared/regions";
import type { Layer, LayerLocation } from "@wartownik/shared/types/layers";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { EAS_PROJECT_ID } from "./config";
import { REGIONS } from "./regions";
import { getSettings, loadSettings } from "./settings";
import type { Settings } from "./settings";
import { trpcClient } from "./trpc";

export const ALERT_CHANNEL_ID = "alerts";
const BACKGROUND_TASK = "wartownik-region-check";
const LAST_STATUS_KEY = "wartownik-last-alert-status";
const PUSH_TOKEN_KEY = "wartownik-push-token";
const BACKGROUND_INTERVAL_MINUTES = 15;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureAlertChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
      name: "Alerty zagrożeń",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: "#DC2626",
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAlertChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function getPushToken(): Promise<string | null> {
  if (EAS_PROJECT_ID === undefined) {
    return null;
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    return data;
  } catch (error) {
    console.warn(
      "Push token unavailable, using local notifications only:",
      error,
    );
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function syncNotificationSubscription(settings: Settings) {
  const previousToken = await getStoredPushToken();
  if (
    !settings.notificationsEnabled ||
    settings.watchedRegionIds.length === 0
  ) {
    if (previousToken !== null) {
      await trpcClient.notifications.unsubscribe
        .mutate({ token: previousToken })
        .catch(() => undefined);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK).catch(
      () => undefined,
    );
    return { push: false };
  }

  await registerBackgroundCheck();
  const token = await getPushToken();
  if (token === null) {
    return { push: false };
  }
  await trpcClient.notifications.subscribe.mutate({
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
    regionIds: settings.watchedRegionIds,
    minStatus: settings.minStatus,
  });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return { push: true };
}

async function readLastStatuses(): Promise<Record<string, RegionStatus>> {
  const raw = await AsyncStorage.getItem(LAST_STATUS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as Record<string, RegionStatus>);
}

export async function notifyEscalations(
  states: RegionState[],
  settings: Settings,
): Promise<number> {
  if (!settings.notificationsEnabled) {
    return 0;
  }
  const watched = states.filter((state) =>
    settings.watchedRegionIds.includes(state.id),
  );
  const last = await readLastStatuses();
  const next = { ...last };
  const usesPush = (await getStoredPushToken()) !== null;
  let sent = 0;

  for (const state of watched) {
    const previous = last[state.id] ?? "none";
    next[state.id] = state.status;
    const escalated =
      REGION_STATUS_RANK[state.status] > REGION_STATUS_RANK[previous];
    const aboveThreshold =
      REGION_STATUS_RANK[state.status] >=
      REGION_STATUS_RANK[settings.minStatus];
    if (escalated && aboveThreshold && !usesPush) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            state.status === "threat"
              ? "⚠ Zagrożenie w Twoim województwie"
              : "⚠ Zagrożenie się zbliża",
          body: regionAlertText(state),
          data: { regionId: state.id, status: state.status },
          sound: "default",
        },
        trigger:
          Platform.OS === "android" ? { channelId: ALERT_CHANNEL_ID } : null,
      });
      sent += 1;
    }
  }
  await AsyncStorage.setItem(LAST_STATUS_KEY, JSON.stringify(next));
  return sent;
}

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const settings = await loadSettings();
    const { points } = await trpcClient.layers.get.query({ layer: "drones" });
    const states = computeRegionStates(
      REGIONS,
      points as LayerLocation<Layer.Drones>[],
    );
    await notifyEscalations(states, settings);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundCheck() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return;
  }
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: BACKGROUND_INTERVAL_MINUTES,
    });
  }
}

export { getSettings };
