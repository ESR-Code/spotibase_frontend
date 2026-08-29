export const GEO_MAP_STYLE_IDS = [
  "midnight",
  "daylight",
  "voyager",
  "streets",
  "noir",
  "political",
] as const;

export type GeoMapStyleId = (typeof GEO_MAP_STYLE_IDS)[number];

export type GeoMapStyleTemplate = {
  id: GeoMapStyleId;
  label: string;
  description: string;
  url: string;
  previewSrc: string;
  swatches: [string, string, string];
};

export const DEFAULT_GEO_MAP_STYLE_ID: GeoMapStyleId = "daylight";

export const GEO_MAP_STYLES: readonly GeoMapStyleTemplate[] = [
  {
    id: "midnight",
    label: "Midnight",
    description: "Dark globe, muted land",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    previewSrc: "/geo-styles/midnight.jpg",
    swatches: ["#0b0b0b", "#2a2a2a", "#8a8a8a"],
  },
  {
    id: "daylight",
    label: "Daylight",
    description: "Pale land, soft water",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    previewSrc: "/geo-styles/daylight.jpg",
    swatches: ["#d9e4ea", "#f4f4f2", "#b8c4cc"],
  },
  {
    id: "voyager",
    label: "Voyager",
    description: "Warm atlas colors",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    previewSrc: "/geo-styles/voyager.jpg",
    swatches: ["#8ecae6", "#f3e6c9", "#b5d5a5"],
  },
  {
    id: "streets",
    label: "Streets",
    description: "Classic colorful map",
    url: "https://tiles.openfreemap.org/styles/bright",
    previewSrc: "/geo-styles/streets.jpg",
    swatches: ["#7eb6e0", "#d5e8b0", "#f2d98c"],
  },
  {
    id: "noir",
    label: "Noir",
    description: "Night streets, low glare",
    url: "https://tiles.openfreemap.org/styles/dark",
    previewSrc: "/geo-styles/noir.jpg",
    swatches: ["#12151c", "#3a4250", "#c9a35a"],
  },
  {
    id: "political",
    label: "Political",
    description: "Colorful country fills",
    url: "https://demotiles.maplibre.org/globe.json",
    previewSrc: "/geo-styles/political.jpg",
    swatches: ["#4c7bd9", "#e2b344", "#d46a8a"],
  },
];

const STYLE_BY_ID = Object.fromEntries(
  GEO_MAP_STYLES.map((style) => [style.id, style]),
) as Record<GeoMapStyleId, GeoMapStyleTemplate>;

export function isGeoMapStyleId(value: unknown): value is GeoMapStyleId {
  return (
    typeof value === "string" &&
    (GEO_MAP_STYLE_IDS as readonly string[]).includes(value)
  );
}

export function resolveGeoMapStyle(
  id: string | null | undefined,
): GeoMapStyleTemplate {
  if (isGeoMapStyleId(id)) return STYLE_BY_ID[id];
  return STYLE_BY_ID[DEFAULT_GEO_MAP_STYLE_ID];
}

export function geoMapStyleUrls(id: string | null | undefined): {
  light: string;
  dark: string;
} {
  const url = resolveGeoMapStyle(id).url;
  return { light: url, dark: url };
}
