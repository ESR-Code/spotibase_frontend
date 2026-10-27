import type { ButtonBlockColor } from "@/lib/editor/types/hotspot-block";

/**
 * Action button fills. `neutral` and `accent` follow the editor / Preview
 * theme (accent = Preview accent color); the rest are fixed presets. `swatch`
 * is only the picker dot.
 */
export const BUTTON_BLOCK_COLORS: Array<{
  id: ButtonBlockColor;
  label: string;
  swatch: string;
}> = [
  { id: "neutral", label: "Neutral", swatch: "#5b6989" },
  { id: "accent", label: "Theme accent", swatch: "#e63946" },
  { id: "blue", label: "Blue", swatch: "#3a56d4" },
  { id: "green", label: "Green", swatch: "#1f8a5b" },
  { id: "amber", label: "Amber", swatch: "#f4a259" },
  { id: "red", label: "Red", swatch: "#d62839" },
  { id: "purple", label: "Purple", swatch: "#7b61ff" },
];

export const DEFAULT_BUTTON_BLOCK_COLOR: ButtonBlockColor = "neutral";

/** Blocks saved before colors existed rendered with the accent fill. */
export function resolveButtonBlockColor(
  color: ButtonBlockColor | undefined,
): ButtonBlockColor {
  return BUTTON_BLOCK_COLORS.some((item) => item.id === color)
    ? (color as ButtonBlockColor)
    : "accent";
}
