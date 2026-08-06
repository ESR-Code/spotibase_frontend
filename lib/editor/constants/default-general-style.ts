import {
  GENERAL_STYLE_SURFACES,
  type GeneralStyleSettings,
  type GeneralStyleSurfaceId,
  type SurfaceColorTokens,
} from "@/lib/editor/types/general-style";
import { editorColors } from "@/lib/editor/theme/tokens";

function defaultSurfaces(): GeneralStyleSettings["surfaces"] {
  const surfaces = {} as GeneralStyleSettings["surfaces"];
  for (const surface of GENERAL_STYLE_SURFACES) {
    surfaces[surface.id] = {
      backgroundColor: editorColors.panel,
      textColor: editorColors.fg,
    };
  }
  return surfaces;
}

/** Defaults mirror editor chrome / glass so Preview starts looking like the studio. */
export const DEFAULT_GENERAL_STYLE: GeneralStyleSettings = {
  accentColor: editorColors.crimson,
  inputBackgroundColor: editorColors.inputBg,
  inputTextColor: editorColors.fg,
  bordersEnabled: true,
  borderColor: editorColors.line,
  /** Matches `.editor-glass` alpha. */
  surfaceOpacity: 0.85,
  /** Matches `.editor-glass` backdrop blur. */
  surfaceBlur: 14,
  surfaces: defaultSurfaces(),
};

export function cloneGeneralStyle(
  style: GeneralStyleSettings,
): GeneralStyleSettings {
  const surfaces = {} as GeneralStyleSettings["surfaces"];
  for (const surface of GENERAL_STYLE_SURFACES) {
    const id = surface.id as GeneralStyleSurfaceId;
    const tokens: SurfaceColorTokens = style.surfaces[id] ?? {
      backgroundColor: editorColors.panel,
      textColor: editorColors.fg,
    };
    surfaces[id] = { ...tokens };
  }
  return {
    accentColor: style.accentColor,
    inputBackgroundColor: style.inputBackgroundColor,
    inputTextColor: style.inputTextColor,
    bordersEnabled: style.bordersEnabled,
    borderColor: style.borderColor,
    surfaceOpacity: style.surfaceOpacity,
    surfaceBlur: style.surfaceBlur,
    surfaces,
  };
}
