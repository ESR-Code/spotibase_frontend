import { create } from "zustand";
import { defaultGeoGlobeViewport, type GeoMapViewport } from "@/lib/editor/geo/resolve-home-viewport";

type MapViewportState = GeoMapViewport & {
  setViewport: (viewport: GeoMapViewport) => void;
};

export const useMapViewportStore = create<MapViewportState>((set) => ({
  ...defaultGeoGlobeViewport(),
  setViewport: (viewport) => set({ ...viewport }),
}));
