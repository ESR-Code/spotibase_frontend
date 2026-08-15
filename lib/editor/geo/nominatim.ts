export type NominatimHit = {
  displayName: string;
  lng: number;
  lat: number;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchNominatimPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<NominatimHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "VectorForge-editor/1.0 (geo-map scene)",
    },
  });
  if (!response.ok) {
    throw new Error("Place search failed");
  }

  const data = (await response.json()) as Array<{
    display_name?: string;
    lon?: string;
    lat?: string;
  }>;

  return data
    .map((item) => {
      const lng = Number(item.lon);
      const lat = Number(item.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || !item.display_name) {
        return null;
      }
      return { displayName: item.display_name, lng, lat };
    })
    .filter((hit): hit is NominatimHit => hit != null);
}
