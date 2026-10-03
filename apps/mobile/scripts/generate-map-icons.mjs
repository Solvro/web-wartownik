import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const webRequire = createRequire(
  path.join(process.cwd(), "../web/package.json"),
);
const nextRequire = createRequire(webRequire.resolve("next/package.json"));
const lucide = webRequire("lucide");
const sharp = nextRequire("sharp");

const ICONS = {
  bomb: "Bomb",
  drone: "Drone",
  flame: "Flame",
  megaphone: "Megaphone",
  "message-square-warning": "MessageSquareWarning",
  plane: "Plane",
  radar: "Radar",
  rocket: "Rocket",
  "square-activity": "SquareActivity",
  warehouse: "Warehouse",
  waves: "Waves",
  wind: "Wind",
  zap: "Zap",
};

const SIZE = 72;
const outputDir = path.join(process.cwd(), "assets", "map-icons");
await mkdir(outputDir, { recursive: true });

const attributes = (attrs) =>
  Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

const VARIANTS = {
  ...Object.fromEntries(
    Object.entries(ICONS).map(([name, exportName]) => [
      name,
      { exportName, transform: "" },
    ]),
  ),
  "plane-east": { exportName: "Plane", transform: "rotate(45 12 12)" },
  "plane-west": {
    exportName: "Plane",
    transform: "translate(24 0) scale(-1 1) rotate(45 12 12)",
  },
};

for (const [name, { exportName, transform }] of Object.entries(VARIANTS)) {
  const node = lucide[exportName];
  const children = node
    .map(([tag, attrs]) => `<${tag} ${attributes(attrs)}/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><g transform="${transform}">${children}</g></svg>`;
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outputDir, `${name}.png`));
}
console.log(
  `Generated ${Object.keys(VARIANTS).length} map icons in assets/map-icons`,
);
