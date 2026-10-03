# Defensownik

Mapa bezpieczeństwa dla Polski: schrony, drony i rakiety, samoloty wojskowe, jakość powietrza,
pożary, stany ostrzegawcze rzek, defibrylatory (AED) i zgłoszenia mieszkańców w jednym miejscu,
plus interaktywna lista „plecaka bezpieczeństwa”.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query,
Drizzle ORM, PostgreSQL 17 + PostGIS 3.5, Google Maps (`google-map-react`), `supercluster`.

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

## Wymagane klucze API

- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`: Google Maps JavaScript API z włączonymi Places i Geocoding,
- `NASA_FIRMS_MAP_KEY`: klucz [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/map_key/),
- `DATABASE_URI`: connection string do Postgresa z PostGIS.

Opcjonalne zmienne opisuje [`.env.example`](.env.example).

## Uruchomienie lokalne

```bash
pnpm install
docker compose up -d
cp .env.example .env.local   # uzupełnij klucze
pnpm db:migrate
pnpm db:seed                 # wymaga assets/PL.geojson (patrz niżej)
pnpm db:sync-shelters
pnpm dev
```

`DATABASE_URI` dla lokalnej bazy: `postgres://postgres:postgres@localhost:5434/postgres`.

Przy starcie serwera migracje uruchamiają się automatycznie, a schrony synchronizują się w tle,
gdy tabela jest pusta lub dane są starsze niż 7 dni. Błąd bazy nie zatrzymuje serwera: warstwy
niezależne od bazy działają dalej.

### Dane defibrylatorów

`pnpm db:seed` wczytuje `assets/PL.geojson` (FeatureCollection punktów OSM z właściwościami
`@osm_type`, `@osm_id`, `@osm_version` i tagami AED). Plik można przygotować z Overpass API,
np. zapytaniem `nwr["emergency"="defibrillator"](area.pl); out center meta;` i konwersją do GeoJSON.

## Skrypty

`dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `db:generate`, `db:migrate`,
`db:studio`, `db:seed`, `db:sync-shelters`.
