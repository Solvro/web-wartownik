import { z } from "zod";

import {
  registerPushToken,
  unregisterPushToken,
} from "../services/notifications";
import { publicProcedure, router } from "../trpc";

const regionId = z.string().regex(/^PL-\d{2}$/);

export const notificationsRouter = router({
  subscribe: publicProcedure
    .input(
      z.object({
        token: z.string().min(10).max(255),
        platform: z.enum(["ios", "android"]),
        regionIds: z.array(regionId).min(1).max(16),
        minStatus: z
          .enum(["watch", "approaching", "threat"])
          .default("approaching"),
      }),
    )
    .mutation(async ({ input }) => {
      await registerPushToken(input);
      return { success: true } as const;
    }),
  unsubscribe: publicProcedure
    .input(z.object({ token: z.string().min(10).max(255) }))
    .mutation(async ({ input }) => {
      await unregisterPushToken(input.token);
      return { success: true } as const;
    }),
});
