import { create } from "zustand";
import type { CoordVec3, EnuPoint, GeoPoint } from "@/lib/editor/types/geo-reference";

type CoordsInspectorState = {
  clickInspectEnabled: boolean;
  local: CoordVec3 | null;
  reverseGeo: GeoPoint | null;
  reverseLocal: CoordVec3 | null;
  reverseWorld: EnuPoint | null;
  reverseError: string | null;
  setClickInspectEnabled: (enabled: boolean) => void;
  setLocal: (local: CoordVec3 | null) => void;
  setReverseResult: (input: {
    geo: GeoPoint;
    local: CoordVec3 | null;
    world: EnuPoint | null;
    error: string | null;
  }) => void;
  clearReverse: () => void;
  reset: () => void;
};

export const useCoordsInspectorStore = create<CoordsInspectorState>((set) => ({
  clickInspectEnabled: false,
  local: null,
  reverseGeo: null,
  reverseLocal: null,
  reverseWorld: null,
  reverseError: null,
  setClickInspectEnabled: (enabled) =>
    set(
      enabled
        ? { clickInspectEnabled: true }
        : {
            clickInspectEnabled: false,
            local: null,
            reverseGeo: null,
            reverseLocal: null,
            reverseWorld: null,
            reverseError: null,
          },
    ),
  setLocal: (local) => set({ local }),
  setReverseResult: ({ geo, local, world, error }) =>
    set({
      reverseGeo: geo,
      reverseLocal: local,
      reverseWorld: world,
      reverseError: error,
    }),
  clearReverse: () =>
    set({
      reverseGeo: null,
      reverseLocal: null,
      reverseWorld: null,
      reverseError: null,
    }),
  reset: () =>
    set({
      clickInspectEnabled: false,
      local: null,
      reverseGeo: null,
      reverseLocal: null,
      reverseWorld: null,
      reverseError: null,
    }),
}));
