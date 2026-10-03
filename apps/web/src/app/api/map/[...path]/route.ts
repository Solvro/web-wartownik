import type { NextRequest } from "next/server";

const UPSTREAM = "https://tiles.openfreemap.org/";
const ALLOWED_PREFIXES = [
  "styles/",
  "planet",
  "fonts/",
  "sprites/",
  "natural_earth/",
];
const DEFAULT_CACHE = "public, max-age=86400";

function publicOrigin(request: NextRequest) {
  const host = (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  )
    ?.split(",")[0]
    ?.trim();
  if (host === undefined || host === "") {
    return request.nextUrl.origin;
  }
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/map/[...path]">,
) {
  const path = (await ctx.params).path.map(encodeURIComponent).join("/");
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(`${UPSTREAM}${path}`, { cache: "no-store" });
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": upstream.headers.get("cache-control") ?? DEFAULT_CACHE,
  };

  if (contentType.includes("json")) {
    const proxyBase = `${publicOrigin(request)}/api/map/`;
    const body = (await upstream.text()).replaceAll(UPSTREAM, proxyBase);
    return new Response(body, { headers });
  }
  return new Response(await upstream.arrayBuffer(), { headers });
}
