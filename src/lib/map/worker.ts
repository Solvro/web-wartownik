import { getVersion, setWorkerUrl } from "maplibre-gl";

let configured = false;

export function configureMapLibreWorker() {
  if (!configured) {
    setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`);
    configured = true;
  }
}
