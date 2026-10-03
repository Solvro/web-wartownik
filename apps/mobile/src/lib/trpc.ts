import type { AppRouter } from "@defensownik/api";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  splitLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import { API_URL } from "./config";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

const url = `${API_URL}/api/trpc`;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "query",
      true: httpLink({ url, transformer: superjson }),
      false: httpBatchLink({ url, transformer: superjson }),
    }),
  ],
});
