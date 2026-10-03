import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export interface Context {
  resHeaders?: Headers;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export function setCacheControl(ctx: Context, value: string) {
  ctx.resHeaders?.set("Cache-Control", value);
}
