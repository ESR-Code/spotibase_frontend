"use client";

import { setWorkerUrl } from "maplibre-gl";

/**
 * MapLibre v6 locates its worker with `new URL("./maplibre-gl-worker.mjs", import.meta.url)`.
 * Bundlers do not emit that file, so the browser fetches a Next.js HTML fallback and
 * rejects it as a module script. Point at the copies in /public instead.
 */
if (typeof window !== "undefined") {
  setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
}
