import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const publicDir = path.join(process.cwd(), "public");

const maplibreDir = path.dirname(require.resolve("maplibre-gl/package.json"));
const { version } = JSON.parse(
  await readFile(path.join(maplibreDir, "package.json"), "utf8"),
);
const workerTarget = path.join(publicDir, "maplibre", version);
await rm(path.join(publicDir, "maplibre"), { recursive: true, force: true });
await mkdir(workerTarget, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(
    path.join(maplibreDir, "dist", file),
    path.join(workerTarget, file),
  );
}

const geoSource = path.resolve(process.cwd(), "../../packages/shared/geo");
const geoTarget = path.join(publicDir, "geo");
await rm(geoTarget, { recursive: true, force: true });
await mkdir(geoTarget, { recursive: true });
for (const file of await readdir(geoSource)) {
  await copyFile(path.join(geoSource, file), path.join(geoTarget, file));
}

console.log(`Copied MapLibre ${version} worker and geo data to public/`);
