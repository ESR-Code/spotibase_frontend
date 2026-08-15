import { create } from "zustand";
import {
  cloneGeoSettings,
  DEFAULT_GEO_SETTINGS,
} from "@/lib/editor/constants/default-settings";
import type { GeoSettings } from "@/lib/editor/types/geo-settings";

type GeoState = GeoSettings & {
  setGeo: (patch: Partial<GeoSettings>) => void;
  resetGeo: () => void;
  hydrateGeo: (geo: GeoSettings) => void;
};

function pickGeo(state: GeoState): GeoSettings {
  return cloneGeoSettings({
    start: state.start,
    startZoom: state.startZoom,
    mapStyleId: state.mapStyleId,
  });
}

export const useGeoStore = create<GeoState>((set) => ({
  ...cloneGeoSettings(DEFAULT_GEO_SETTINGS),
  setGeo: (patch) => set((state) => ({ ...state, ...patch })),
  resetGeo: () => set({ ...cloneGeoSettings(DEFAULT_GEO_SETTINGS) }),
  hydrateGeo: (geo) => set({ ...cloneGeoSettings(geo) }),
}));

export function readGeoSnapshot(): GeoSettings {
  return pickGeo(useGeoStore.getState());
}
