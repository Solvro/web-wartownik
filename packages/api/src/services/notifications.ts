import { pushSubscriptions, regionAlertState } from "@wartownik/db";
import regionsGeometry from "@wartownik/shared/geo/regions.json";
import {
  REGION_STATUS_RANK,
  computeRegionStates,
  regionAlertText,
} from "@wartownik/shared/regions";
import type {
  RegionCollection,
  RegionState,
  RegionStatus,
} from "@wartownik/shared/regions";
import type { Layer, LayerLocation } from "@wartownik/shared/types/layers";
import { arrayOverlaps, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../db";
import { serverEnv } from "../env";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;
const regions = regionsGeometry as unknown as RegionCollection;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  priority: "high";
  channelId: string;
  data: { regionId: string; status: RegionStatus };
}

interface PushTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

export async function registerPushToken(input: {
  token: string;
  platform: string;
  regionIds: string[];
  minStatus: Exclude<RegionStatus, "none">;
}) {
  await getDb()
    .insert(pushSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: pushSubscriptions.token,
      set: {
        platform: input.platform,
        regionIds: input.regionIds,
        minStatus: input.minStatus,
        updatedAt: new Date(),
      },
    });
}

export async function unregisterPushToken(token: string) {
  await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.token, token));
}

function alertTitle(region: RegionState) {
  return region.status === "threat"
    ? "⚠ Zagrożenie w Twoim województwie"
    : region.status === "approaching"
      ? "⚠ Zagrożenie się zbliża"
      : "Zagrożenie w pobliżu";
}

async function sendPushMessages(messages: PushMessage[]) {
  const { EXPO_ACCESS_TOKEN } = serverEnv();
  const invalidTokens: string[] = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(EXPO_ACCESS_TOKEN === undefined
          ? {}
          : { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` }),
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      throw new Error(
        `Expo push failed: ${response.status} ${await response.text()}`,
      );
    }
    const { data } = (await response.json()) as { data: PushTicket[] };
    data.forEach((ticket, index) => {
      if (ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(batch[index].to);
      }
    });
  }
  if (invalidTokens.length > 0) {
    await getDb()
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.token, invalidTokens));
  }
}

export async function dispatchRegionAlerts(
  threats: LayerLocation<Layer.Drones>[],
): Promise<number> {
  const db = getDb();
  const states = computeRegionStates(regions, threats).filter(
    (state) => state.country === "PL",
  );
  const previousRows = await db.select().from(regionAlertState);
  const previous = new Map(
    previousRows.map((row) => [row.regionId, row.status]),
  );
  const initialised = previousRows.length > 0;

  const changed = initialised
    ? states.filter(
        (state) => (previous.get(state.id) ?? "none") !== state.status,
      )
    : states;
  if (changed.length > 0) {
    await getDb()
      .insert(regionAlertState)
      .values(
        changed.map((state) => ({
          regionId: state.id,
          status: state.status,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: regionAlertState.regionId,
        set: { status: sql`excluded.status`, updatedAt: new Date() },
      });
  }
  if (!initialised) {
    return 0;
  }

  const escalated = changed.filter(
    (state) =>
      REGION_STATUS_RANK[state.status] >
      REGION_STATUS_RANK[previous.get(state.id) ?? "none"],
  );
  if (escalated.length === 0) {
    return 0;
  }

  const subscriptions = await getDb()
    .select()
    .from(pushSubscriptions)
    .where(
      arrayOverlaps(
        pushSubscriptions.regionIds,
        escalated.map((state) => state.id),
      ),
    );

  const messages: PushMessage[] = [];
  for (const subscription of subscriptions) {
    for (const state of escalated) {
      if (
        subscription.regionIds.includes(state.id) &&
        REGION_STATUS_RANK[state.status] >=
          REGION_STATUS_RANK[subscription.minStatus]
      ) {
        messages.push({
          to: subscription.token,
          title: alertTitle(state),
          body: regionAlertText(state),
          sound: "default",
          priority: "high",
          channelId: "alerts",
          data: { regionId: state.id, status: state.status },
        });
      }
    }
  }
  if (messages.length > 0) {
    await sendPushMessages(messages);
    console.info(
      `Sent ${messages.length} region alert notification(s) for ${escalated.map((state) => `${state.id}:${state.status}`).join(", ")}.`,
    );
  }
  return messages.length;
}
