import { layersRouter } from "./routers/layers";
import {
  aircraftRouter,
  alertsRouter,
  geocodeRouter,
  offlineRouter,
  reportsRouter,
  systemRouter,
  threatsRouter,
} from "./routers/misc";
import { notificationsRouter } from "./routers/notifications";
import { router } from "./trpc";

export const appRouter = router({
  layers: layersRouter,
  reports: reportsRouter,
  geocode: geocodeRouter,
  aircraft: aircraftRouter,
  threats: threatsRouter,
  offline: offlineRouter,
  notifications: notificationsRouter,
  system: systemRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;
