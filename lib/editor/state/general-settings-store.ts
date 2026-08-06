import { create } from "zustand";
import {
  cloneGeneralStyle,
  DEFAULT_GENERAL_STYLE,
} from "@/lib/editor/constants/default-general-style";
import type {
  GeneralStyleGlobalTokens,
  GeneralStyleSettings,
  GeneralStyleSurfaceId,
  SurfaceColorTokens,
} from "@/lib/editor/types/general-style";
import { GENERAL_STYLE_SURFACES } from "@/lib/editor/types/general-style";

type GeneralSettingsState = {
  style: GeneralStyleSettings;
  setGlobalToken: <K extends keyof GeneralStyleGlobalTokens>(
    key: K,
    value: GeneralStyleGlobalTokens[K],
  ) => void;
  setSurfaceColors: (
    surfaceId: GeneralStyleSurfaceId,
    patch: Partial<SurfaceColorTokens>,
  ) => void;
  setStyle: (patch: Partial<GeneralStyleSettings>) => void;
  resetStyle: () => void;
};

function mergeSurfaces(
  current: GeneralStyleSettings["surfaces"],
  patch?: Partial<GeneralStyleSettings["surfaces"]>,
): GeneralStyleSettings["surfaces"] {
  if (!patch) return current;
  const next = { ...current };
  for (const surface of GENERAL_STYLE_SURFACES) {
    const id = surface.id;
    if (patch[id]) {
      next[id] = { ...current[id], ...patch[id] };
    }
  }
  return next;
}

export const useGeneralSettingsStore = create<GeneralSettingsState>((set) => ({
  style: cloneGeneralStyle(DEFAULT_GENERAL_STYLE),
  setGlobalToken: (key, value) =>
    set((state) => ({
      style: { ...state.style, [key]: value },
    })),
  setSurfaceColors: (surfaceId, patch) =>
    set((state) => ({
      style: {
        ...state.style,
        surfaces: {
          ...state.style.surfaces,
          [surfaceId]: {
            ...state.style.surfaces[surfaceId],
            ...patch,
          },
        },
      },
    })),
  setStyle: (patch) =>
    set((state) => ({
      style: {
        ...state.style,
        ...patch,
        surfaces: mergeSurfaces(state.style.surfaces, patch.surfaces),
      },
    })),
  resetStyle: () => set({ style: cloneGeneralStyle(DEFAULT_GENERAL_STYLE) }),
}));

export function readGeneralStyleSnapshot(): GeneralStyleSettings {
  return cloneGeneralStyle(useGeneralSettingsStore.getState().style);
}
