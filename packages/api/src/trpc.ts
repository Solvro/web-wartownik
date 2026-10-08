import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export interface Context {
  resHeaders?: Headers;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  sse: {
    ping: { enabled: true, intervalMs: 15_000 },
    client: { reconnectAfterInactivityMs: 40_000 },
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export function setCacheControl(ctx: Context, value: string) {
  ctx.resHeaders?.set("Cache-Control", value);
}
