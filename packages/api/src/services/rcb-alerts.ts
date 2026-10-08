import regionsGeometry from "@wartownik/shared/geo/regions.json";
import type {
  RcbAlert,
  RcbAlertLevel,
  RcbAlerts,
} from "@wartownik/shared/types/rcb-alerts";

import { fetchQuery } from "../helpers/fetch-query";

const RSO_URL =
  "https://komunikaty.tvp.pl/komunikatyxml/wszystkie/wszystkie/1?_format=json";
const GOV_ORIGIN = "https://www.gov.pl";
const GOV_RCB_URL = `${GOV_ORIGIN}/web/rcb`;
const GOV_ARTICLES_PER_FETCH = 4;
const GOV_LOOKBACK_DAYS = 1;
const RECIPIENTS_RANGE = 600;
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; wartownik)" };

const RCB_ORIGIN = ["alert rcb", "uwaga! uwaga! uwaga", "rcb"];
const AIR_MARKERS = [
  "powietrzn",
  "z powietrza",
  "dron",
  "bezzalogow",
  "bsp",
  "shahed",
  "geran",
  "rakiet",
  "pocisk",
  "nalot",
  "ostrzal",
  "obiekt lataj",
  "naruszenie przestrzeni",
  "mysliwc",
  "obrony powietrzn",
  "obiekt powietrzn",
];
const END_MARKERS = [
  "zakonczyl",
  "zakonczen",
  "odwol",
  "brak zagroz",
  "zniesion",
  "sytuacja opanowan",
];
const CONTINUE_MARKERS = [
  "do odwolania",
  "do czasu odwolania",
  "do czasu zakonczenia",
  "az do odwolania",
];
const LEVEL_MARKERS: [RcbAlertLevel, string[]][] = [
  [3, ["znajdz bezpieczne miejsce", "zagrozenie atakiem z powietrza"]],
  [2, ["zmasowany"]],
];

interface RsoItem {
  id: number;
  title: string;
  shortcut: string | null;
  content: string | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string | null;
  updated_at: string | null;
  provinces: Record<string, { name: string; slug_name: string }> | unknown[];
}

const fold = (text: string) =>
  text.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");

const voivodeships = (
  regionsGeometry as unknown as {
    features: { properties: { id: string; name: string; country: string } }[];
  }
).features
  .map((feature) => feature.properties)
  .filter((region) => region.country === "PL");

const regionIdBySlug = new Map(
  voivodeships.map((region) => [
    fold(region.name).replace(/\s+/g, "-"),
    region.id,
  ]),
);

const voivodeshipStems = voivodeships
  .map((region) => {
    const name = fold(region.name);
    const stem = name.endsWith("ie") ? name.slice(0, -2) : name;
    return { id: region.id, stems: [stem, stem.replace(/-/g, " ")] };
  })
  .sort((a, b) => b.stems[0].length - a.stems[0].length);

const includesAny = (text: string, markers: string[]) =>
  markers.some((marker) => text.includes(marker));

function isCancellation(text: string): boolean {
  let folded = fold(text);
  for (const marker of CONTINUE_MARKERS) {
    folded = folded.split(marker).join(" ");
  }
  return includesAny(folded, END_MARKERS);
}

function alertLevel(text: string): RcbAlertLevel {
  const folded = fold(text);
  return (
    LEVEL_MARKERS.find(([, markers]) => includesAny(folded, markers))?.[0] ?? 1
  );
}

function warsawOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(utcMs);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const local = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
  );
  return Math.round((local - utcMs) / 60_000);
}

function warsawToIso(local: string | null): string | null {
  const match = local?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match == null) {
    return null;
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(naive - warsawOffsetMinutes(naive) * 60_000).toISOString();
}

function warsawDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(ms);
}

function rsoAlerts(items: RsoItem[], now: number): RcbAlert[] {
  const alerts = items.flatMap((item): RcbAlert[] => {
    const text = [item.title, item.shortcut, item.content]
      .filter(Boolean)
      .join(" ");
    const folded = fold(text);
    if (!includesAny(folded, RCB_ORIGIN)) {
      return [];
    }
    const validTo = warsawToIso(item.valid_to);
    if (validTo !== null && Date.parse(validTo) < now) {
      return [];
    }
    const provinces = Array.isArray(item.provinces)
      ? []
      : Object.values(item.provinces);
    const regionIds = [
      ...new Set(
        provinces.flatMap((province) => {
          const id = regionIdBySlug.get(
            province.slug_name || fold(province.name).replace(/\s+/g, "-"),
          );
          return id === undefined ? [] : [id];
        }),
      ),
    ];
    const title = item.title.trim();
    const shortcut = item.shortcut?.trim() ?? "";
    const content = item.content?.trim() || null;
    const message =
      fold(shortcut) !== fold(title) && shortcut.length > 0
        ? shortcut
        : (content ?? title);
    return [
      {
        id: `rso:${item.id}`,
        source: "rso",
        title,
        message,
        details: content === message ? null : content,
        regionIds,
        issuedAt:
          warsawToIso(item.created_at ?? item.valid_from) ??
          new Date(now).toISOString(),
        issuedAtPrecision: "minute",
        validTo,
        air: includesAny(folded, AIR_MARKERS),
        level: alertLevel(text),
        cancelled: isCancellation(text),
        url: null,
      },
    ];
  });

  const cancellations = alerts.filter((alert) => alert.air && alert.cancelled);
  return alerts.map((alert) =>
    alert.air &&
    !alert.cancelled &&
    cancellations.some(
      (cancel) =>
        cancel.issuedAt > alert.issuedAt &&
        cancel.regionIds.some((id) => alert.regionIds.includes(id)),
    )
      ? { ...alert, cancelled: true }
      : alert,
  );
}

const ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  amp: "&",
  lt: "<",
  gt: ">",
  nbsp: " ",
  bdquo: "„",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  oacute: "ó",
  Oacute: "Ó",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x?[0-9a-f]+|[a-z]{2,10});/gi,
    (match, code: string) => {
      if (code.startsWith("#")) {
        const value =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(value) ? String.fromCodePoint(value) : match;
      }
      return ENTITIES[code] ?? match;
    },
  );
}

const htmlToText = (html: string) =>
  decodeEntities(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

function recipientRegions(text: string): string[] {
  const found = new Set<string>();
  const folded = fold(text).replace(/\([^)]*\)/g, " ");
  const anchor = /wyslan|odbiorc/g;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(folded)) !== null) {
    let range = folded.slice(match.index, match.index + RECIPIENTS_RANGE);
    for (const { id, stems } of voivodeshipStems) {
      const stem = stems.find((candidate) => range.includes(candidate));
      if (stem !== undefined) {
        found.add(id);
        range = range.split(stem).join("·");
      }
    }
  }
  return [...found];
}

async function govArticle(
  href: string,
  title: string,
  now: number,
): Promise<RcbAlert | null> {
  const html = await fetchQuery<string>(
    `${GOV_ORIGIN}${href}`,
    { headers: HEADERS, next: { revalidate: 60 } },
    false,
  );
  const text = htmlToText(html);
  const start = text.lastIndexOf(title);
  const end = text.indexOf('{"register"', start);
  const body = text.slice(Math.max(start, 0), end > start ? end : undefined);
  const date = body.match(/\b(\d{2})\.(\d{2})\.(20\d{2})\b/);
  if (date === null) {
    return null;
  }
  const isoDate = `${date[3]}-${date[2]}-${date[1]}`;
  const oldest = warsawDate(now - GOV_LOOKBACK_DAYS * 86_400_000);
  if (isoDate < oldest) {
    return null;
  }
  const quotes = [...body.matchAll(/[„"]([^”"]{20,600})[”"]/g)].map((quote) =>
    quote[1].trim(),
  );
  const alertQuotes = quotes.filter((quote) => !isCancellation(quote));
  const message = alertQuotes[0] ?? quotes[0] ?? title;
  const air = includesAny(fold(`${title} ${quotes.join(" ")}`), AIR_MARKERS);
  return {
    id: `gov:${href}`,
    source: "gov",
    title,
    message,
    details: quotes.length > 1 ? quotes.join("\n\n") : null,
    regionIds: recipientRegions(body),
    issuedAt: warsawToIso(`${isoDate} 00:00`) ?? new Date(now).toISOString(),
    issuedAtPrecision: "day",
    validTo: null,
    air,
    level: alertLevel(alertQuotes.join(" ") || message),
    cancelled: quotes.some(isCancellation),
    url: `${GOV_ORIGIN}${href}`,
  };
}

async function govAlerts(now: number): Promise<RcbAlert[]> {
  const html = await fetchQuery<string>(
    GOV_RCB_URL,
    { headers: HEADERS, next: { revalidate: 60 } },
    false,
  );
  const links = new Map<string, string>();
  for (const match of html.matchAll(
    /href="(\/web\/rcb\/alert-rcb[a-z0-9-]*)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const title = htmlToText(match[2]);
    if (title.length >= 8 && !links.has(match[1])) {
      links.set(match[1], title);
    }
  }
  const articles = await Promise.allSettled(
    [...links]
      .slice(0, GOV_ARTICLES_PER_FETCH)
      .map(([href, title]) => govArticle(href, title, now)),
  );
  return articles.flatMap((article) =>
    article.status === "fulfilled" && article.value?.air === true
      ? [article.value]
      : [],
  );
}

export async function getRcbAlerts(): Promise<RcbAlerts> {
  const now = Date.now();
  const [rso, gov] = await Promise.allSettled([
    fetchQuery<{ newses?: RsoItem[] }>(RSO_URL, {
      headers: HEADERS,
      next: { revalidate: 30 },
    }).then((data) => rsoAlerts(data.newses ?? [], now)),
    govAlerts(now),
  ]);
  if (rso.status === "rejected" && gov.status === "rejected") {
    throw rso.reason;
  }
  const alerts = [
    ...(rso.status === "fulfilled" ? rso.value : []),
    ...(gov.status === "fulfilled" ? gov.value : []),
  ].sort(
    (a, b) =>
      Number(b.air && !b.cancelled) - Number(a.air && !a.cancelled) ||
      b.issuedAt.localeCompare(a.issuedAt),
  );
  return { updatedAt: new Date(now).toISOString(), alerts };
}
