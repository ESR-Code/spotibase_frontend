import type { CSSProperties } from "react";
import {
  GENERAL_STYLE_SURFACES,
  type GeneralStyleSettings,
  type GeneralStyleSurfaceId,
} from "@/lib/editor/types/general-style";

/** camelCase surface id → kebab-case CSS custom property stem. */
function surfaceVarStem(id: GeneralStyleSurfaceId): string {
  return id.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}

export function surfaceCssVarNames(id: GeneralStyleSurfaceId): {
  bg: string;
  fg: string;
} {
  const stem = surfaceVarStem(id);
  return {
    bg: `--preview-surface-${stem}-bg`,
    fg: `--preview-surface-${stem}-fg`,
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Maps general style settings to CSS custom properties for Preview surfaces. */
export function generalStyleToCssVars(
  style: GeneralStyleSettings,
): CSSProperties {
  const opacityPct = `${Math.round(clamp01(style.surfaceOpacity) * 100)}%`;
  const blurPx = `${Math.max(0, style.surfaceBlur)}px`;

  const vars: Record<string, string> = {
    "--preview-accent": style.accentColor,
    "--preview-input-bg": style.inputBackgroundColor,
    "--preview-input-fg": style.inputTextColor,
    "--preview-border": style.bordersEnabled ? style.borderColor : "transparent",
    "--preview-surface-opacity": opacityPct,
    "--preview-surface-blur": blurPx,
  };

  for (const surface of GENERAL_STYLE_SURFACES) {
    const tokens = style.surfaces[surface.id];
    const keys = surfaceCssVarNames(surface.id);
    vars[keys.bg] = tokens.backgroundColor;
    vars[keys.fg] = tokens.textColor;
  }

  return vars as CSSProperties;
}
