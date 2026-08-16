import { usePreviewAppearanceStore } from "@/lib/editor/state/preview-appearance-store";
import type {
  ChangeHotspotColorActionNode,
  ChangeHotspotIconActionNode,
} from "@/lib/editor/types/hotspot-action";
import { normalizeCategoryIcon } from "@/lib/editor/theme/category-icons";

export function validateChangeHotspotColorData(
  data: ChangeHotspotColorActionNode["data"],
): string | null {
  if (!data.hotspotIds.length) return "Select at least one hotspot";
  const color = data.color.trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return "Pick a valid color";
  }
  return null;
}

export function validateChangeHotspotIconData(
  data: ChangeHotspotIconActionNode["data"],
): string | null {
  if (!data.hotspotIds.length) return "Select at least one hotspot";
  return null;
}

/**
 * Apply color overrides for the current Preview session only.
 * Empty `color` restores each target's authored color.
 */
export function applyChangeHotspotColor(
  data: ChangeHotspotColorActionNode["data"],
): void {
  const color = data.color.trim();
  usePreviewAppearanceStore
    .getState()
    .setColor(data.hotspotIds, color || null);
}

/**
 * Apply icon overrides for the current Preview session only.
 * Empty `icon` restores each target's authored icon/style.
 */
export function applyChangeHotspotIcon(
  data: ChangeHotspotIconActionNode["data"],
): void {
  const icon = data.icon.trim();
  usePreviewAppearanceStore
    .getState()
    .setIcon(data.hotspotIds, icon ? normalizeCategoryIcon(icon) : null);
}
