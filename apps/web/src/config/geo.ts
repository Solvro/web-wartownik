const version = process.env.NEXT_PUBLIC_GEO_VERSION ?? "dev";

const geoUrl = (file: string) => `/geo/${file}?v=${version}`;

export const GEO_URLS = {
  regions: geoUrl("regions.json"),
  regionLabels: geoUrl("region-labels.json"),
  countries: geoUrl("countries.json"),
  ukraineRaions: geoUrl("ukraine-raions.json"),
} as const;
