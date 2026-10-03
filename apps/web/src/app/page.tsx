import { LAYER_VISUALS } from "@defensownik/shared/config/layer-visuals";
import { REGION_STATUS_VISUALS } from "@defensownik/shared/regions";
import { LAYERS } from "@defensownik/shared/types/layers";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import heroDark from "@/assets/hero_dark.png";
import heroLight from "@/assets/hero_light.png";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { env } from "@/env";

const SOURCES: Record<string, string> = {
  Schrony: "KG PSP",
  "Drony i rakiety": "NEPTUN (OSINT)",
  "Samoloty wojskowe": "adsb.lol",
  "Jakość powietrza": "GIOŚ",
  Pożary: "NASA FIRMS",
  "Poziom wody": "IMGW-PIB",
  "Defibrylatory (AED)": "OpenStreetMap",
  "Zgłoszenia użytkowników": "Społeczność",
};

const STATUS_STEPS = [
  {
    status: "watch" as const,
    text: "Obiekt jest do 50 km od granicy województwa albo jego niepewność położenia sięga granicy.",
  },
  {
    status: "approaching" as const,
    text: "Przewidywany tor lotu przecina województwo. Liczymy szacowany czas dotarcia.",
  },
  {
    status: "threat" as const,
    text: "Aktywne zagrożenie znajduje się w granicach województwa.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,var(--color-blue-600)_28%,transparent),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] mask-[radial-gradient(70%_60%_at_50%_0%,black,transparent)] bg-size-[56px_56px] opacity-60" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/map">Otwórz mapę</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="flex flex-col items-center pt-16 pb-14 text-center md:pt-24">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Dane na żywo z 8 źródeł
          </span>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Wiedz, co dzieje się{" "}
            <span className="bg-linear-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">
              wokół Ciebie
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-balance text-muted-foreground md:text-lg">
            Defensownik zbiera w jednym miejscu zagrożenia powietrzne przy
            granicy, schrony, defibrylatory, pożary, jakość powietrza i stany
            rzek, a dla każdego województwa wylicza status zagrożenia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/map">
                Otwórz mapę
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={{ pathname: "/map", query: { symulacja: "1" } }}>
                <Play />
                Zobacz symulację
              </Link>
            </Button>
          </div>
        </section>

        <section className="relative">
          <div className="absolute -inset-x-10 -top-10 -z-10 h-2/3 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="overflow-hidden rounded-2xl border bg-background/60 p-1.5 shadow-2xl backdrop-blur">
            <Image
              src={heroLight}
              alt="Defensownik – mapa w jasnym motywie"
              className="block rounded-xl dark:hidden"
              priority
              placeholder="blur"
              sizes="(min-width: 1152px) 1152px, 100vw"
            />
            <Image
              src={heroDark}
              alt="Defensownik – mapa w ciemnym motywie"
              className="hidden rounded-xl dark:block"
              priority
              placeholder="blur"
              sizes="(min-width: 1152px) 1152px, 100vw"
            />
          </div>
        </section>

        <section className="py-24">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Jedna mapa, osiem warstw
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Każdą warstwę włączysz osobno. Dane odświeżają się automatycznie –
            zagrożenia powietrzne i lotnictwo co 15 sekund.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LAYERS.map((layer) => {
              const { icon, color, description } = LAYER_VISUALS[layer];
              return (
                <li
                  key={layer}
                  className="flex flex-col gap-3 rounded-2xl border bg-card/50 p-4"
                >
                  <span
                    className="flex size-9 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon name={icon} className="size-4.5" strokeWidth={2.25} />
                  </span>
                  <div>
                    <h3 className="font-medium">{layer}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <span className="mt-auto font-mono text-[11px] text-muted-foreground">
                    {SOURCES[layer]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="grid gap-10 border-t py-24 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Status zagrożenia dla województw
            </h2>
            <p className="mt-2 text-muted-foreground">
              Z pozycji, kursu, prędkości i niepewności położenia obiektów
              liczymy, które województwa są zagrożone teraz, a do których
              zagrożenie się zbliża.
            </p>
          </div>
          <ol className="flex flex-col gap-3">
            {STATUS_STEPS.map(({ status, text }) => {
              const visual = REGION_STATUS_VISUALS[status];
              return (
                <li
                  key={status}
                  className="flex gap-4 rounded-2xl border p-4"
                  style={{
                    background: `linear-gradient(90deg, color-mix(in srgb, ${visual.color} 12%, transparent), transparent 60%)`,
                  }}
                >
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: visual.color }}
                  />
                  <div>
                    <h3 className="font-medium">{visual.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl">
            Defensownik to nieoficjalne źródło dodatkowe. Nie zastępuje syren,
            alertów RCB ani RSO – w razie zagrożenia kieruj się komunikatami
            służb. Numer alarmowy: 112.
          </p>
          <p>
            © {new Date().getFullYear()}{" "}
            {env.NEXT_PUBLIC_AUTHOR_URL === undefined ? (
              env.NEXT_PUBLIC_AUTHOR_NAME
            ) : (
              <a
                href={env.NEXT_PUBLIC_AUTHOR_URL}
                className="hover:text-foreground"
              >
                {env.NEXT_PUBLIC_AUTHOR_NAME}
              </a>
            )}
            {" · "}
            <Link href="/privacy-policy" className="hover:text-foreground">
              Prywatność
            </Link>
            {" · "}
            <Link href="/terms-of-service" className="hover:text-foreground">
              Warunki
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
