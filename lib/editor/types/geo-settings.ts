export type GeoLngLat = {
  lng: number;
  lat: number;
};

export type GeoSettings = {
  /** Start pin. Null opens the default world globe. */
  start: GeoLngLat | null;
  /** Zoom used with `start`, or the default globe zoom when start is null. */
  startZoom: number;
  /** Basemap color template id from `GEO_MAP_STYLES`. */
  mapStyleId: string;
};
