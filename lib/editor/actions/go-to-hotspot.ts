import { focusHotspotCamera } from "@/lib/editor/preview/open-hotspot-in-preview";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import type {
  GoToHotspotActionNode,
  GoToHotspotOffset,
} from "@/lib/editor/types/hotspot-action";

export function asGoToHotspotOffset(value: unknown): GoToHotspotOffset {
  if (value === "next" || value === "prev" || value === "self") return value;
  return "self";
}

export function validateGoToHotspotData(
  data: GoToHotspotActionNode["data"],
): string | null {
  if (!data.hotspotId) return "Select a target hotspot";
  const exists = useEditorStore
    .getState()
    .hotspots.some((hotspot) => hotspot.id === data.hotspotId);
  if (!exists) return "Target hotspot no longer exists";
  return null;
}

/** Resolve destination id from a reference hotspot + offset (wraps in scene order). */
export function resolveGoToHotspotId(
  hotspotId: number,
  offset: GoToHotspotOffset,
): number | null {
  const hotspots = useEditorStore.getState().hotspots;
  if (hotspots.length === 0) return null;
  const index = hotspots.findIndex((hotspot) => hotspot.id === hotspotId);
  if (index < 0) return null;
  if (offset === "self") return hotspots[index].id;
  if (offset === "next") {
    return hotspots[(index + 1) % hotspots.length].id;
  }
  return hotspots[(index - 1 + hotspots.length) % hotspots.length].id;
}

/** Fly the Preview / editor camera to the resolved hotspot. */
export function applyGoToHotspot(data: GoToHotspotActionNode["data"]): void {
  const targetId = resolveGoToHotspotId(
    data.hotspotId,
    asGoToHotspotOffset(data.offset),
  );
  if (targetId == null) return;
  focusHotspotCamera(targetId);
}
