/**
 * Shared color tokens for a preview UI surface.
 * Extend this shape when a specific surface needs more tokens.
 */
export type SurfaceColorTokens = {
  backgroundColor: string;
  textColor: string;
  /** When false, the surface outer border is hidden. */
  strokeEnabled: boolean;
  /** Outer border / stroke color when stroke is enabled. */
  strokeColor: string;
};

/**
 * Registry of styleable preview surfaces.
 * Add a new entry here (+ defaults + CSS var usage) to expose it in General Settings.
 */
export const GENERAL_STYLE_SURFACES = [
  {
    id: "legendDrawer",
    label: "Legend drawer",
    description: "Browse panel opened from the Legend control in Preview",
  },
  {
    id: "sceneExplorerDrawer",
    label: "Scene explorer",
    description: "Browse panel opened from the Scene Explorer control in Preview",
  },
  {
    id: "hotspotDialog",
    label: "Hotspot modal / drawer / info box",
    description: "Content surface shown when a hotspot is opened in Preview",
  },
] as const;

export type GeneralStyleSurfaceId = (typeof GENERAL_STYLE_SURFACES)[number]["id"];

/** Project-wide Preview chrome tokens (not tied to a single surface). */
export type GeneralStyleGlobalTokens = {
  /** Primary / accent actions in Preview (buttons, Legend control, close hover). */
  accentColor: string;
  /** Background for inputs / selects inside Preview surfaces. */
  inputBackgroundColor: string;
  /** Text color for inputs / selects inside Preview surfaces. */
  inputTextColor: string;
  /** When false, Preview surfaces render without divider/control borders. */
  bordersEnabled: boolean;
  /** Dividers and control borders inside Preview surfaces (when enabled). */
  borderColor: string;
  /** Opacity of Preview drawer/modal panels (0–1). Matches editor glass at 0.85. */
  surfaceOpacity: number;
  /** Backdrop blur radius in px for Preview drawer/modal panels. */
  surfaceBlur: number;
};

/** Preview styling for the viewport bottom controls bar. */
export type BottomMenuStyleTokens = {
  backgroundColor: string;
  iconColor: string;
  /** Border / stroke around the bottom menu glass. */
  strokeColor: string;
  /** Opacity of the bottom menu glass (0–1). */
  opacity: number;
  /** Backdrop blur radius in px. */
  blur: number;
};

export type GeneralStyleSettings = GeneralStyleGlobalTokens & {
  surfaces: Record<GeneralStyleSurfaceId, SurfaceColorTokens>;
  bottomMenu: BottomMenuStyleTokens;
};

type GlobalColorKey = "accentColor" | "inputBackgroundColor" | "inputTextColor";

/** Global color fields shown as top-level Style swatches (other tokens handled separately). */
export const GENERAL_STYLE_GLOBAL_COLOR_FIELDS = [
  {
    key: "accentColor",
    label: "Accent color",
    description: "Buttons, Legend control, and close-button hover in Preview",
  },
  {
    key: "inputBackgroundColor",
    label: "Input background",
    description: "Background for text fields and selects in Preview panels",
  },
  {
    key: "inputTextColor",
    label: "Input text",
    description: "Text color inside Preview inputs and selects",
  },
] as const satisfies ReadonlyArray<{
  key: GlobalColorKey;
  label: string;
  description: string;
}>;
