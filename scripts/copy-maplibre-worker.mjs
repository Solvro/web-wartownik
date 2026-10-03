import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const source = path.join(process.cwd(), "node_modules", "maplibre-gl");
const { version } = JSON.parse(
  await readFile(path.join(source, "package.json"), "utf8"),
);
const targetRoot = path.join(process.cwd(), "public", "maplibre");
const target = path.join(targetRoot, version);

await rm(targetRoot, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(path.join(source, "dist", file), path.join(target, file));
}
console.log(`Copied MapLibre ${version} worker to public/maplibre/${version}`);
