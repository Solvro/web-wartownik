import type { Map as MapLibreMap } from "maplibre-gl";

import { ICONS, isIconName } from "@/config/icons";
import type { IconName } from "@/config/icons";

const PIXEL_RATIO = 2;
const MARKER_SIZE = 30;
const ICON_SIZE = 15;
const ARROW_SIZE = 46;

type IconElement = [string, Record<string, string | number | undefined>];

const num = (value: string | number | undefined) => Number(value ?? 0);

function traceElement(
  ctx: CanvasRenderingContext2D,
  [tag, attrs]: IconElement,
) {
  switch (tag) {
    case "path":
      ctx.stroke(new Path2D(String(attrs.d)));
      return;
    case "circle":
      ctx.beginPath();
      ctx.arc(num(attrs.cx), num(attrs.cy), num(attrs.r), 0, Math.PI * 2);
      ctx.stroke();
      return;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(
        num(attrs.cx),
        num(attrs.cy),
        num(attrs.rx),
        num(attrs.ry),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      return;
    case "rect":
      ctx.beginPath();
      ctx.roundRect(
        num(attrs.x),
        num(attrs.y),
        num(attrs.width),
        num(attrs.height),
        num(attrs.rx),
      );
      ctx.stroke();
      return;
    case "line":
      ctx.beginPath();
      ctx.moveTo(num(attrs.x1), num(attrs.y1));
      ctx.lineTo(num(attrs.x2), num(attrs.y2));
      ctx.stroke();
      return;
    case "polyline":
    case "polygon": {
      const coords = String(attrs.points)
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      ctx.beginPath();
      for (let i = 0; i < coords.length; i += 2) {
        ctx[i === 0 ? "moveTo" : "lineTo"](coords[i], coords[i + 1]);
      }
      if (tag === "polygon") {
        ctx.closePath();
      }
      ctx.stroke();
      return;
    }
  }
}

function createCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size * PIXEL_RATIO;
  canvas.height = size * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("Canvas 2D context is not available");
  }
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  return ctx;
}

function drawMarker(icon: IconName, color: string): ImageData {
  const ctx = createCanvas(MARKER_SIZE);
  const center = MARKER_SIZE / 2;

  ctx.beginPath();
  ctx.arc(center, center, center - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.save();
  ctx.translate(center - ICON_SIZE / 2, center - ICON_SIZE / 2);
  ctx.scale(ICON_SIZE / 24, ICON_SIZE / 24);
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  for (const element of ICONS[icon].node as IconElement[]) {
    traceElement(ctx, element);
  }
  ctx.restore();

  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawArrow(color: string): ImageData {
  const ctx = createCanvas(ARROW_SIZE);
  const center = ARROW_SIZE / 2;
  ctx.beginPath();
  ctx.moveTo(center, 1);
  ctx.lineTo(center + 6, 10);
  ctx.lineTo(center - 6, 10);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export const markerImageId = (icon: IconName, color: string) =>
  `marker:${icon}:${color}`;
export const arrowImageId = (color: string) => `arrow:${color}`;

export function addMissingImage(map: MapLibreMap, id: string) {
  if (map.hasImage(id)) {
    return;
  }
  const [kind, first, second] = id.split(":");
  if (
    kind === "marker" &&
    first !== undefined &&
    second !== undefined &&
    isIconName(first)
  ) {
    map.addImage(id, drawMarker(first, second), { pixelRatio: PIXEL_RATIO });
  } else if (kind === "arrow" && first !== undefined) {
    map.addImage(id, drawArrow(first), { pixelRatio: PIXEL_RATIO });
  } else {
    map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
  }
}
