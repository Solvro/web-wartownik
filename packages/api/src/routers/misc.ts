import { TRPCError } from "@trpc/server";
import { reports } from "@wartownik/db";
import { reportFormSchema } from "@wartownik/shared/schemas/report";
import { z } from "zod";

import { getDb } from "../db";
import { getAircraftDetails } from "../services/aircraft-details";
import { searchPlaces } from "../services/geocode";
import { getOfflinePack } from "../services/offline";
import { getThreatTrack } from "../services/threat-track";
import { getUkraineAlerts } from "../services/ukraine-alerts";
import { publicProcedure, router, setCacheControl } from "../trpc";

const gateway = (message: string, cause: unknown) => {
  console.error(`${message}:`, cause);
  return new TRPCError({ code: "BAD_GATEWAY", message, cause });
};

export const reportsRouter = router({
  create: publicProcedure
    .input(reportFormSchema)
    .mutation(async ({ input }) => {
      await getDb().insert(reports).values(input);
      return { success: true } as const;
    }),
});

export const geocodeRouter = router({
  search: publicProcedure
    .input(z.object({ q: z.string().trim().min(2).max(120) }))
    .query(async ({ input, ctx }) => {
      try {
        const results = await searchPlaces(input.q);
        setCacheControl(ctx, "public, max-age=86400");
        return results;
      } catch (error) {
        throw gateway("Geocoding failed", error);
      }
    }),
});

export const aircraftRouter = router({
  details: publicProcedure
    .input(z.object({ hex: z.string().regex(/^[0-9a-fA-F]{6}$/) }))
    .query(async ({ input, ctx }) => {
      setCacheControl(ctx, "public, max-age=30, stale-while-revalidate=60");
      return getAircraftDetails(input.hex.toLowerCase());
    }),
});

export const threatsRouter = router({
  track: publicProcedure
    .input(z.object({ id: z.string().regex(/^[\w-]{1,64}$/) }))
    .query(async ({ input, ctx }) => {
      try {
        const track = await getThreatTrack(input.id);
        setCacheControl(ctx, "public, max-age=10, stale-while-revalidate=20");
        return track;
      } catch (error) {
        throw gateway("Failed to fetch track", error);
      }
    }),
});

export const offlineRouter = router({
  pack: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusKm: z
          .union([z.literal(10), z.literal(30), z.literal(50)])
          .default(30),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await getOfflinePack(
          { lat: input.lat, lng: input.lng },
          input.radiusKm,
        );
      } catch (error) {
        throw gateway("Failed to build offline pack", error);
      }
    }),
});

export const alertsRouter = router({
  ukraine: publicProcedure.query(async ({ ctx }) => {
    try {
      const alerts = await getUkraineAlerts();
      setCacheControl(ctx, "public, max-age=30, stale-while-revalidate=60");
      return alerts;
    } catch (error) {
      throw gateway("Failed to fetch Ukraine alerts", error);
    }
  }),
});

export const systemRouter = router({
  ping: publicProcedure.query(() => ({ serverTime: new Date().toISOString() })),
});
