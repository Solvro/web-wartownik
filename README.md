# Defensownik

Mapa bezpieczeństwa dla Polski: schrony, drony i rakiety, samoloty wojskowe, jakość powietrza,
pożary, stany ostrzegawcze rzek, defibrylatory (AED) i zgłoszenia mieszkańców w jednym miejscu.
Na mapie są granice 16 województw oraz obwodów Ukrainy i Białorusi. Dla każdego regionu liczony jest status zagrożenia powietrznego (w regionie / zbliża się
z ETA / w pobliżu) na podstawie pozycji, kursu, prędkości i niepewności położenia obiektów.

Tryb symulacji (`/map?symulacja`) dokłada skryptowany scenariusz: grupa dronów leci znad obwodu
wołyńskiego nad województwo lubelskie, a wszystkie elementy są oznaczone jako „SYMULACJA”.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query,
Drizzle ORM, PostgreSQL 17 + PostGIS 3.5, MapLibre GL (`react-map-gl`) z kafelkami
[OpenFreeMap](https://openfreemap.org), geokodowanie [Photon](https://photon.komoot.io),
granice województw z [polska-geojson](https://github.com/ppatrzyk/polska-geojson), obwodów Ukrainy
i Białorusi z [geoBoundaries](https://www.geoboundaries.org) (ODbL) i Turf.

## Źródła danych

| Warstwa           | Źródło                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| Schrony           | KG PSP, [gdziesieukryc.pl](https://gdziesieukryc.pl) (CSV, synchronizacja co 7 dni) |
| Drony i rakiety   | [NEPTUN](https://neptun.in.ua/) (agregator OSINT)                                   |
| Samoloty wojskowe | [adsb.lol](https://adsb.lol/) `/v2/mil` (ADS-B, ODbL)                               |
| Jakość powietrza  | GIOŚ                                                                                |
| Pożary            | NASA FIRMS (VIIRS NOAA-20)                                                          |
| Poziom wody       | IMGW-PIB                                                                            |
| Defibrylatory     | OpenStreetMap (`emergency=defibrillator`)                                           |

## Struktura (monorepo pnpm + Turborepo)

| Ścieżka           | Zawartość                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web`        | Next.js 16 – strona i mapa, handler tRPC `/api/trpc`, start zadań w tle (`instrumentation.ts`)         |
| `apps/mobile`     | Expo SDK 57 (React Native, expo-router, MapLibre RN) – mapa, „Mój region”, tryb offline, powiadomienia |
| `packages/api`    | tRPC v11 (routery, serwisy źródeł danych, rejestrator pozycji zagrożeń, wysyłka powiadomień push)      |
| `packages/db`     | Drizzle ORM: schemat, migracje, seed AED                                                               |
| `packages/shared` | Typy, konfiguracja warstw, prezentacja jako czyste dane, statusy regionów, geometria granic            |

## Wymagane klucze API

- `NASA_FIRMS_MAP_KEY`: klucz [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/map_key/),
- `DATABASE_URI`: connection string do Postgresa z PostGIS,
- opcjonalnie `EXPO_ACCESS_TOKEN`: token Expo, jeśli projekt wymaga autoryzacji wysyłki push,
- opcjonalnie `DEMO_SCENARIO=lubelskie`: serwer dokłada symulowane drony (test powiadomień).

Mapa, kafelki i wyszukiwarka nie wymagają kluczy. Wszystkie zmienne trzymamy w `.env.local`
w katalogu głównym repozytorium.

## Uruchomienie lokalne

```bash
pnpm install
docker compose up -d
cp .env.example .env.local   # uzupełnij klucze
pnpm db:migrate
pnpm db:seed                 # wymaga packages/db/assets/PL.geojson (patrz niżej)
pnpm db:sync-shelters
pnpm dev                     # web na http://localhost:3000
```

Przy starcie serwera migracje uruchamiają się automatycznie, schrony synchronizują się w tle, a co 15 s
lider (wybrany przez `pg_try_advisory_lock`) zapisuje pozycje zagrożeń i liczy statusy województw do
powiadomień push.

### Aplikacja mobilna

Aplikacja wymaga development builda (MapLibre to moduł natywny, nie działa w Expo Go).

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm android   # expo run:android
adb reverse tcp:3000 tcp:3000                             # telefon przez USB widzi lokalny serwer
```

Bez `EXPO_PUBLIC_API_URL` aplikacja łączy się z `https://defensownik.solvro.pl`.

Powiadomienia:

- **push z serwera** wymaga projektu EAS (`extra.eas.projectId` w `app.json`) oraz na Androidzie
  `google-services.json` z Firebase i poświadczeń FCM V1 wgranych do EAS,
- bez tej konfiguracji aplikacja działa w **trybie lokalnym**: zadanie w tle (co ok. 15 min) i aplikacja na
  pierwszym planie liczą statusy obserwowanych województw i pokazują lokalne powiadomienia.

Tryb offline: ostatnie dane z serwera są zapisywane (cache zapytań na 7 dni), granice regionów są wbudowane
w aplikację, a „Dane offline” w ustawieniach pobierają schrony i AED w promieniu 10/30/50 km – najbliższy
schron i kompas działają wtedy bez internetu. Zgłoszenia wysłane bez sieci trafiają do kolejki.

### Dane defibrylatorów

`pnpm db:seed` wczytuje `packages/db/assets/PL.geojson` (FeatureCollection punktów OSM z właściwościami
`@osm_type`, `@osm_id`, `@osm_version` i tagami AED). Plik można przygotować z Overpass API,
np. zapytaniem `nwr["emergency"="defibrillator"](area.pl); out center meta;` i konwersją do GeoJSON.

## Skrypty (katalog główny)

`dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `db:generate`, `db:migrate`,
`db:studio`, `db:seed`, `db:sync-shelters`.
