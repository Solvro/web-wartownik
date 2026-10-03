import {
  POLAND_BOUNDS,
  POLAND_CENTER,
} from "@defensownik/shared/config/constants";
import { LAYER_CONFIG, layerFromSlug } from "@defensownik/shared/config/layers";
import { Layer } from "@defensownik/shared/types/layers";
import type {
  LayerData,
  LayerFetchFunction,
} from "@defensownik/shared/types/layers";
import type { Viewport } from "@defensownik/shared/types/map";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { LAYER_FETCHERS } from "../services";
import { syncSheltersIfStale } from "../services/shelters";
import { publicProcedure, router, setCacheControl } from "../trpc";

const SLUGS = Object.values(LAYER_CONFIG).map((config) => config.slug) as [
  string,
  ...string[],
];

const viewportSchema = z.object({
  west: z.number().min(-180).max(180).default(POLAND_BOUNDS.west),
  east: z.number().min(-180).max(180).default(POLAND_BOUNDS.east),
  south: z.number().min(-90).max(90).default(POLAND_BOUNDS.south),
  north: z.number().min(-90).max(90).default(POLAND_BOUNDS.north),
  zoom: z.number().min(0).max(22).default(6),
  lat: z.number().min(-90).max(90).default(POLAND_CENTER.lat),
  lng: z.number().min(-180).max(180).default(POLAND_CENTER.lng),
});

export const layersRouter = router({
  get: publicProcedure
    .input(
      z.object({
        layer: z.enum(SLUGS),
        viewport: viewportSchema.optional(),
      }),
    )
    .query(async ({ input, ctx }): Promise<LayerData> => {
      const layer = layerFromSlug(input.layer);
      if (layer === undefined) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown layer" });
      }
      const { west, east, south, north, zoom, lat, lng } = viewportSchema.parse(
        input.viewport ?? {},
      );
      const viewport: Viewport = {
        bounds: {
          nw: { lat: north, lng: west },
          se: { lat: south, lng: east },
        },
        zoom,
        center: { lat, lng },
      };
      if (layer === Layer.Shelters) {
        void syncSheltersIfStale();
      }
      try {
        const data = await (LAYER_FETCHERS[layer] as LayerFetchFunction)(
          viewport,
        );
        setCacheControl(ctx, LAYER_CONFIG[layer].cacheControl);
        return data;
      } catch (error) {
        console.error(`Failed to fetch layer ${layer}:`, error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Failed to fetch layer data",
          cause: error,
        });
      }
    }),
});
