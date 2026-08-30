import { ownerKeyFor } from "@/lib/editor/actions/action-owners";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import {
  hasFieldTokens,
  interpolatePlainText,
  substituteTokensForValidation,
} from "@/lib/editor/actions/interpolate-fields";
import { focusHotspotCamera } from "@/lib/editor/preview/open-hotspot-in-preview";
import { findHotspot, listPreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import type {
  GoToHotspotActionNode,
  GoToHotspotOffset,
} from "@/lib/editor/types/hotspot-action";
import { toast } from "sonner";

/** Prevents infinite loops when destination graphs also Go To Hotspot + run actions. */
const runningTargetActionIds = new Set<number>();

export function asGoToHotspotOffset(value: unknown): GoToHotspotOffset {
  if (value === "next" || value === "prev" || value === "self") return value;
  return "self";
}

/** Format a hotspot id as the familiar `HSP-001` label. */
export function formatHotspotRef(id: number): string {
  return `HSP-${String(id).padStart(3, "0")}`;
}

/**
 * Parse a resolved hotspot ref (`3`, `HSP-003`, `hsp-3`) into a numeric id.
 * Returns null when the string is empty or not a hotspot id.
 */
export function parseHotspotRef(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  const hsp = /^HSP-0*(\d+)$/i.exec(text);
  if (hsp) {
    const id = Number(hsp[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  if (/^\d+$/.test(text)) {
    const id = Number(text);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  return null;
}

/** Migrate legacy numeric `hotspotId` / string refs into `hotspotRef`. */
export function asHotspotRef(data: {
  hotspotRef?: unknown;
  hotspotId?: unknown;
}): string {
  if (typeof data.hotspotRef === "string") return data.hotspotRef;
  if (typeof data.hotspotId === "string") return data.hotspotId;
  if (
    typeof data.hotspotId === "number" &&
    Number.isFinite(data.hotspotId) &&
    data.hotspotId > 0
  ) {
    return formatHotspotRef(data.hotspotId);
  }
  return "";
}

/**
 * Resolve a (possibly templated) hotspotRef to a numeric id.
 * When `interpolate` is false, tokens are substituted with a placeholder for validation.
 */
export function resolveHotspotRefToId(
  hotspotRef: string,
  options?: { interpolate?: boolean },
): number | null {
  const template = hotspotRef.trim();
  if (!template) return null;

  const interpolate = options?.interpolate !== false;
  let resolved = template;
  if (hasFieldTokens(template)) {
    resolved = interpolate
      ? interpolatePlainText(template)
      : substituteTokensForValidation(template, "1");
  }

  return parseHotspotRef(resolved);
}

export function validateGoToHotspotData(
  data: GoToHotspotActionNode["data"],
): string | null {
  const ref = data.hotspotRef?.trim() ?? "";
  if (!ref) return "Select or enter a target hotspot";

  const dynamic = hasFieldTokens(ref);
  const id = resolveHotspotRefToId(ref, { interpolate: !dynamic });
  if (id == null) {
    return dynamic
      ? "Hotspot ref must resolve to HSP-### or a numeric id"
      : "Enter HSP-###, a numeric id, or HSP-{{field}}";
  }

  if (dynamic) return null;

  const exists = listPreviewHotspots().some((hotspot) => hotspot.id === id);
  if (!exists) return "Target hotspot no longer exists";
  return null;
}

/** Resolve destination id from a reference hotspot + offset (wraps in scene order). */
export function resolveGoToHotspotId(
  hotspotId: number,
  offset: GoToHotspotOffset,
): number | null {
  const hotspots = listPreviewHotspots();
  if (hotspots.length === 0) return null;
  const index = hotspots.findIndex((hotspot) => hotspot.id === hotspotId);
  if (index < 0) return null;
  if (offset === "self") return hotspots[index].id;
  if (offset === "next") {
    return hotspots[(index + 1) % hotspots.length].id;
  }
  return hotspots[(index - 1 + hotspots.length) % hotspots.length].id;
}

/**
 * Fly the camera to the resolved hotspot.
 * Optionally runs that hotspot's action chain when `runTargetActions` is on.
 */
export async function applyGoToHotspot(
  data: GoToHotspotActionNode["data"],
): Promise<void> {
  const baseId = resolveHotspotRefToId(data.hotspotRef, { interpolate: true });
  if (baseId == null) {
    toast.error("Go To Hotspot: could not resolve hotspot ref");
    return;
  }

  const targetId = resolveGoToHotspotId(
    baseId,
    asGoToHotspotOffset(data.offset),
  );
  if (targetId == null) return;

  focusHotspotCamera(targetId);

  if (!data.runTargetActions) return;

  if (runningTargetActionIds.has(targetId)) {
    toast.error("Go To Hotspot: skipped recursive target actions");
    return;
  }

  const hotspot = findHotspot(targetId);
  if (!hotspot) return;

  runningTargetActionIds.add(targetId);
  try {
    const { runActionGraph } = await import(
      "@/lib/editor/actions/run-action-graph"
    );
    await runActionGraph(getActionGraph(hotspot), {
      hotspotId: targetId,
      ownerId: targetId,
      ownerKey: ownerKeyFor(targetId),
    });
  } finally {
    runningTargetActionIds.delete(targetId);
  }
}
