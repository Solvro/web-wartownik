import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@wartownik/api";
import superjson from "superjson";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

const TRPC_URL = "/api/trpc";

export function createClient() {
  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: httpSubscriptionLink({ url: TRPC_URL, transformer: superjson }),
        false: splitLink({
          condition: (op) => op.type === "query",
          true: httpLink({ url: TRPC_URL, transformer: superjson }),
          false: httpBatchLink({ url: TRPC_URL, transformer: superjson }),
        }),
      }),
    ],
  });
}
