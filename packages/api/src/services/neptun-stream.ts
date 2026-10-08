import { EventEmitter } from "node:events";

import type { Threat } from "./drones";
import type { NeptunAlertsPayload } from "./ukraine-alerts";

const STREAM_URL = "wss://neptun.in.ua/api/v1/stream";
const STALE_AFTER_MS = 50_000;
const WATCHDOG_MS = 5_000;
const EMIT_THROTTLE_MS = 750;
const MAX_BACKOFF_MS = 30_000;

type StreamMessage =
  | { type: "snapshot"; ts: string; data?: { threats?: unknown[] } }
  | { type: "upsert"; ts: string; data: unknown }
  | { type: "remove"; ts: string; data?: { id?: string } }
  | { type: "heartbeat"; ts: string }
  | { type: "alerts"; ts: string; data: NeptunAlertsPayload };

const isThreat = (value: unknown): value is Threat => {
  const threat = value as Partial<Threat> | null;
  return (
    typeof threat?.id === "string" &&
    typeof threat.lat === "number" &&
    typeof threat.lon === "number"
  );
};

class NeptunStream extends EventEmitter {
  private socket: WebSocket | null = null;
  private threats = new Map<string, Threat>();
  private alerts: NeptunAlertsPayload | null = null;
  private hasSnapshot = false;
  private lastMessageAt = 0;
  private attempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private emitTimer: NodeJS.Timeout | null = null;
  private started = false;
  version = 0;

  start() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.setMaxListeners(0);
    setInterval(() => this.watchdog(), WATCHDOG_MS).unref();
    this.connect();
  }

  get live(): boolean {
    return (
      this.socket?.readyState === WebSocket.OPEN &&
      Date.now() - this.lastMessageAt < STALE_AFTER_MS
    );
  }

  liveThreats(): Threat[] | null {
    return this.live && this.hasSnapshot ? [...this.threats.values()] : null;
  }

  liveAlerts(): NeptunAlertsPayload | null {
    return this.live ? this.alerts : null;
  }

  private connect() {
    let socket: WebSocket;
    try {
      socket = new WebSocket(STREAM_URL);
    } catch (error) {
      console.error("NEPTUN stream failed to open:", error);
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.lastMessageAt = Date.now();
    };
    socket.onmessage = (event) => {
      this.lastMessageAt = Date.now();
      this.attempts = 0;
      this.handle(String(event.data));
    };
    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        this.hasSnapshot = false;
        this.scheduleReconnect();
      }
    };
    socket.onerror = () => socket.close();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null) {
      return;
    }
    this.attempts += 1;
    const delay =
      Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(this.attempts - 1, 5)) +
      Math.floor(Math.random() * 500);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    this.reconnectTimer.unref();
  }

  private watchdog() {
    if (
      this.socket?.readyState === WebSocket.OPEN &&
      Date.now() - this.lastMessageAt > STALE_AFTER_MS
    ) {
      this.socket.close();
    }
  }

  private handle(raw: string) {
    let message: StreamMessage;
    try {
      message = JSON.parse(raw) as StreamMessage;
    } catch {
      return;
    }
    switch (message.type) {
      case "snapshot":
        this.threats = new Map(
          (message.data?.threats ?? [])
            .filter(isThreat)
            .map((threat) => [threat.id, threat]),
        );
        this.hasSnapshot = true;
        this.changed();
        break;
      case "upsert":
        if (isThreat(message.data)) {
          this.threats.set(message.data.id, message.data);
          this.changed();
        }
        break;
      case "remove":
        if (
          message.data?.id !== undefined &&
          this.threats.delete(message.data.id)
        ) {
          this.changed();
        }
        break;
      case "alerts":
        this.alerts = message.data;
        this.changed();
        break;
    }
  }

  private changed() {
    if (this.emitTimer !== null) {
      return;
    }
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.version += 1;
      this.emit("change");
    }, EMIT_THROTTLE_MS);
  }
}

const globalForStream = globalThis as typeof globalThis & {
  neptunStream?: NeptunStream;
};

export function neptunStream(): NeptunStream {
  globalForStream.neptunStream ??= new NeptunStream();
  globalForStream.neptunStream.start();
  return globalForStream.neptunStream;
}
