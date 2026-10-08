import { demoThreats } from "@wartownik/shared/demo";
import type { PoolClient } from "pg";

import { getDb } from "../db";
import { currentThreats, toDronePoints } from "../services/drones";
import { dispatchRegionAlerts } from "../services/notifications";
import {
  pruneThreatPositions,
  recordThreatPositions,
} from "./record-threat-positions";

const INTERVAL_MS = 15_000;
const PRUNE_EVERY_TICKS = 40;
const LEADER_LOCK_ID = 7436002;

let leader: PoolClient | null = null;
let running = false;
let ticks = 0;
let failing = false;

async function holdLeadership(): Promise<boolean> {
  if (leader !== null) {
    return true;
  }
  const client = await getDb().$client.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [LEADER_LOCK_ID],
    );
    if (rows[0]?.locked === true) {
      client.on("error", () => {
        if (leader === client) {
          leader = null;
          client.release(true);
        }
      });
      leader = client;
      return true;
    }
  } catch (error) {
    client.release(true);
    throw error;
  }
  client.release();
  return false;
}

async function tick() {
  if (running) {
    return;
  }
  running = true;
  try {
    if (!(await holdLeadership())) {
      return;
    }
    const threats = await currentThreats({ cache: "no-store" });
    await recordThreatPositions(threats);
    const now = Date.now();
    const points = toDronePoints(threats, now);
    if (process.env.DEMO_SCENARIO === "lubelskie") {
      points.push(...demoThreats(now));
    }
    await dispatchRegionAlerts(points);
    ticks += 1;
    if (ticks % PRUNE_EVERY_TICKS === 1) {
      await pruneThreatPositions();
    }
    if (failing) {
      console.info("Threat recorder recovered.");
      failing = false;
    }
  } catch (error) {
    if (!failing) {
      console.error("Failed to record threat positions:", error);
      failing = true;
    }
    if (leader !== null) {
      leader.release(true);
      leader = null;
    }
  } finally {
    running = false;
  }
}

const globalForJobs = globalThis as typeof globalThis & {
  threatRecorder?: NodeJS.Timeout;
};

export function startThreatRecorder() {
  if (globalForJobs.threatRecorder !== undefined) {
    return;
  }
  globalForJobs.threatRecorder = setInterval(() => void tick(), INTERVAL_MS);
  globalForJobs.threatRecorder.unref();
  void tick();
}
