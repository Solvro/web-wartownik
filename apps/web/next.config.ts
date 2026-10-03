import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "../..");
loadEnvConfig(
  repositoryRoot,
  process.env.NODE_ENV !== "production",
  undefined,
  true,
);

function geoDataVersion(): string {
  const directory = path.join(repositoryRoot, "packages", "shared", "geo");
  const hash = createHash("sha256");
  for (const file of readdirSync(directory).sort()) {
    hash.update(file);
    hash.update(readFileSync(path.join(directory, file)));
  }
  return hash.digest("hex").slice(0, 10);
}

const immutable = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_GEO_VERSION: geoDataVersion(),
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "t.plnspttrs.net" }],
  },
  transpilePackages: [
    "@defensownik/api",
    "@defensownik/db",
    "@defensownik/shared",
  ],
  turbopack: { root: repositoryRoot },
  async headers() {
    return [
      { source: "/maplibre/:path*", headers: immutable },
      {
        source: "/geo/:file*",
        has: [{ type: "query", key: "v" }],
        headers: immutable,
      },
      {
        source: "/geo/:file*",
        missing: [{ type: "query", key: "v" }],
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
    ];
  },
};

export default nextConfig;
