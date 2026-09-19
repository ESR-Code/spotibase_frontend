import { create } from "zustand";
import {
  cloneGeneralStyle,
  DEFAULT_GENERAL_STYLE,
} from "@/lib/editor/constants/default-general-style";
import type {
  BottomMenuStyleTokens,
  GeneralStyleGlobalTokens,
  GeneralStyleSettings,
  GeneralStyleSurfaceId,
  SurfaceColorTokens,
} from "@/lib/editor/types/general-style";
import { GENERAL_STYLE_SURFACES } from "@/lib/editor/types/general-style";

type GeneralSettingsState = {
  style: GeneralStyleSettings;
  /** Project-wide Preview Scene Explorer control. Independent of Style Reset. */
  sceneExplorerEnabled: boolean;
  setGlobalToken: <K extends keyof GeneralStyleGlobalTokens>(
    key: K,
    value: GeneralStyleGlobalTokens[K],
  ) => void;
  setSurfaceColors: (
    surfaceId: GeneralStyleSurfaceId,
    patch: Partial<SurfaceColorTokens>,
  ) => void;
  setBottomMenuToken: <K extends keyof BottomMenuStyleTokens>(
    key: K,
    value: BottomMenuStyleTokens[K],
  ) => void;
  setStyle: (patch: Partial<GeneralStyleSettings>) => void;
  resetStyle: () => void;
  setSceneExplorerEnabled: (value: boolean) => void;
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
  sceneExplorerEnabled: false,
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
  setBottomMenuToken: (key, value) =>
    set((state) => ({
      style: {
        ...state.style,
        bottomMenu: {
          ...state.style.bottomMenu,
          [key]: value,
        },
      },
    })),
  setStyle: (patch) =>
    set((state) => ({
      style: {
        ...state.style,
        ...patch,
        surfaces: mergeSurfaces(state.style.surfaces, patch.surfaces),
        bottomMenu: patch.bottomMenu
          ? { ...state.style.bottomMenu, ...patch.bottomMenu }
          : state.style.bottomMenu,
      },
    })),
  resetStyle: () => set({ style: cloneGeneralStyle(DEFAULT_GENERAL_STYLE) }),
  setSceneExplorerEnabled: (sceneExplorerEnabled) =>
    set({ sceneExplorerEnabled }),
}));

export function readGeneralStyleSnapshot(): GeneralStyleSettings {
  return cloneGeneralStyle(useGeneralSettingsStore.getState().style);
}
