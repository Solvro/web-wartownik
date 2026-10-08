import { on } from "node:events";

import { toDroneLayer } from "../services/drones";
import { neptunStream } from "../services/neptun-stream";
import { toUkraineAlerts } from "../services/ukraine-alerts";
import { publicProcedure, router } from "../trpc";

function liveSnapshot() {
  const stream = neptunStream();
  const threats = stream.liveThreats();
  const alerts = stream.liveAlerts();
  return {
    drones: threats === null ? null : toDroneLayer(threats),
    ukraine: alerts === null ? null : toUkraineAlerts(alerts),
  };
}

export const liveRouter = router({
  feed: publicProcedure.subscription(async function* ({ signal }) {
    const stream = neptunStream();
    yield liveSnapshot();
    for await (const _ of on(stream, "change", { signal })) {
      yield liveSnapshot();
    }
  }),
});
