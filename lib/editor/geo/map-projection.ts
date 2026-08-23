export type GeoMapProjection = { type: "globe" } | { type: "mercator" };

/** MapLibre projection for a geo scene (globe by default). */
export function geoMapProjection(flatProjection: boolean): GeoMapProjection {
  return flatProjection ? { type: "mercator" } : { type: "globe" };
}
