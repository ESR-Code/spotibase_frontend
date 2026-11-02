import { create } from "zustand";
import {
  cloneGeneralStyle,
  DEFAULT_GENERAL_STYLE,
} from "@/lib/editor/constants/default-general-style";
import type {
  DrawerLogoSize,
  PreviewMenuBarPosition,
  PreviewRailSide,
  SceneTransitionSpeed,
  SceneTransitionStyle,
  ViewportLogoPosition,
} from "@/lib/editor/types/editor-settings";
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
  /** Project logo (`asset:<id>` / URL), shown on every scene; empty = none. */
  logoUrl: string;
  /** Viewport logo display scale. */
  logoScale: number;
  /** Viewport logo placement along the top edge. */
  logoPosition: ViewportLogoPosition;
  /** Drop shadow under the viewport logo. */
  logoShadow: boolean;
  /** Invert the viewport logo colors (e.g. dark logo on a dark scene). */
  logoInvert: boolean;
  /** Preview menu bar placement (Preview only; the editor keeps it at the bottom). */
  menuBarPosition: PreviewMenuBarPosition;
  /** Side of the Scene Explorer / Legend buttons; their drawers open on it too. */
  railSide: PreviewRailSide;
  /** Go To Scene splash visual style. */
  sceneTransitionStyle: SceneTransitionStyle;
  /** Go To Scene splash speed. */
  sceneTransitionSpeed: SceneTransitionSpeed;
  /** Project-wide Preview Scene Explorer control. Independent of Style Reset. */
  sceneExplorerEnabled: boolean;
  /** Scene Explorer drawer title. Empty keeps the default “Scene explorer”. */
  sceneExplorerTitle: string;
  /** Inset the Scene Explorer drawer from the top, bottom, and left in Preview. */
  sceneExplorerInset: boolean;
  /** Scene Explorer logo override (`asset:<id>`); empty falls back to the scene logo. */
  sceneExplorerLogoUrl: string;
  /** Hide the Scene Explorer title text when a logo is shown. */
  sceneExplorerHideTitle: boolean;
  /** Scene Explorer header logo size. */
  sceneExplorerLogoSize: DrawerLogoSize;
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
  setLogoUrl: (value: string) => void;
  setLogoScale: (value: number) => void;
  setLogoPosition: (value: ViewportLogoPosition) => void;
  setLogoShadow: (value: boolean) => void;
  setLogoInvert: (value: boolean) => void;
  setMenuBarPosition: (value: PreviewMenuBarPosition) => void;
  setRailSide: (value: PreviewRailSide) => void;
  setSceneTransitionStyle: (value: SceneTransitionStyle) => void;
  setSceneTransitionSpeed: (value: SceneTransitionSpeed) => void;
  setSceneExplorerEnabled: (value: boolean) => void;
  setSceneExplorerTitle: (value: string) => void;
  setSceneExplorerInset: (value: boolean) => void;
  setSceneExplorerLogoUrl: (value: string) => void;
  setSceneExplorerHideTitle: (value: boolean) => void;
  setSceneExplorerLogoSize: (value: DrawerLogoSize) => void;
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
  logoUrl: "",
  logoScale: 1,
  logoPosition: "center",
  logoShadow: true,
  logoInvert: false,
  menuBarPosition: "bottom",
  railSide: "left",
  sceneTransitionStyle: "default",
  sceneTransitionSpeed: "normal",
  sceneExplorerEnabled: false,
  sceneExplorerTitle: "",
  sceneExplorerInset: false,
  sceneExplorerLogoUrl: "",
  sceneExplorerHideTitle: false,
  sceneExplorerLogoSize: "small",
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
  setLogoUrl: (logoUrl) => set({ logoUrl }),
  setLogoScale: (logoScale) => set({ logoScale }),
  setLogoPosition: (logoPosition) => set({ logoPosition }),
  setLogoShadow: (logoShadow) => set({ logoShadow }),
  setLogoInvert: (logoInvert) => set({ logoInvert }),
  setMenuBarPosition: (menuBarPosition) => set({ menuBarPosition }),
  setRailSide: (railSide) => set({ railSide }),
  setSceneTransitionStyle: (sceneTransitionStyle) =>
    set({ sceneTransitionStyle }),
  setSceneTransitionSpeed: (sceneTransitionSpeed) =>
    set({ sceneTransitionSpeed }),
  setSceneExplorerEnabled: (sceneExplorerEnabled) =>
    set({ sceneExplorerEnabled }),
  setSceneExplorerTitle: (sceneExplorerTitle) => set({ sceneExplorerTitle }),
  setSceneExplorerInset: (sceneExplorerInset) => set({ sceneExplorerInset }),
  setSceneExplorerLogoUrl: (sceneExplorerLogoUrl) =>
    set({ sceneExplorerLogoUrl }),
  setSceneExplorerHideTitle: (sceneExplorerHideTitle) =>
    set({ sceneExplorerHideTitle }),
  setSceneExplorerLogoSize: (sceneExplorerLogoSize) =>
    set({ sceneExplorerLogoSize }),
}));

export function readGeneralStyleSnapshot(): GeneralStyleSettings {
  return cloneGeneralStyle(useGeneralSettingsStore.getState().style);
}
