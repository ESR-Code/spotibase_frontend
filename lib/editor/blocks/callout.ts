import type {
  CalloutBlock,
  CalloutTone,
} from "@/lib/editor/types/hotspot-block";

/** Callout colors. `icon` is the default CATEGORY_ICONS name for the tone. */
export const CALLOUT_TONES: Array<{
  id: CalloutTone;
  label: string;
  color: string;
  icon: string;
}> = [
  { id: "neutral", label: "Neutral", color: "#7a88a8", icon: "Info" },
  { id: "info", label: "Blue", color: "#4c8dff", icon: "Info" },
  { id: "success", label: "Green", color: "#2bb673", icon: "BadgeCheck" },
  { id: "warning", label: "Amber", color: "#f4a259", icon: "AlertTriangle" },
  { id: "danger", label: "Red", color: "#e63946", icon: "Hand" },
];

export function calloutTone(tone: CalloutTone) {
  return CALLOUT_TONES.find((item) => item.id === tone) ?? CALLOUT_TONES[1]!;
}

export function resolveCalloutIcon(block: Pick<CalloutBlock, "tone" | "icon">): string {
  return block.icon || calloutTone(block.tone).icon;
}
