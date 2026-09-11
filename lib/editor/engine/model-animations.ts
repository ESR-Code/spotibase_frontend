import type { AnimTrack } from "playcanvas";
import type { ModelAnimationEntry } from "@/lib/editor/state/model-store";

export type CollectedModelAnimation = ModelAnimationEntry & {
  track: AnimTrack;
};

function isAnimTrack(value: unknown): value is AnimTrack {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as AnimTrack).duration === "number" &&
    typeof (value as AnimTrack).name === "string"
  );
}

function trackFromContainerItem(item: unknown): AnimTrack | null {
  if (isAnimTrack(item)) return item;
  if (!item || typeof item !== "object") return null;
  const resource = (item as { resource?: unknown }).resource;
  return isAnimTrack(resource) ? resource : null;
}

/** PlayCanvas blend-tree paths use `.`; keep state names free of it. */
function sanitizeClipId(name: string): string {
  const cleaned = name.replace(/\./g, "_").trim();
  return cleaned || "Animation";
}

/** Named glTF clips on a PlayCanvas container resource. */
export function collectContainerAnimations(
  resource: unknown,
): CollectedModelAnimation[] {
  const animations = (resource as { animations?: unknown } | null)?.animations;
  if (!Array.isArray(animations)) return [];

  const raw: { track: AnimTrack; name: string }[] = [];
  for (const item of animations) {
    const track = trackFromContainerItem(item);
    if (!track) continue;
    const name = track.name.trim() || "Animation";
    raw.push({ track, name });
  }

  const nameCounts = new Map<string, number>();
  for (const item of raw) {
    nameCounts.set(item.name, (nameCounts.get(item.name) ?? 0) + 1);
  }

  const seenNames = new Map<string, number>();
  const seenIds = new Map<string, number>();
  const collected: CollectedModelAnimation[] = [];

  for (const item of raw) {
    const nameIndex = seenNames.get(item.name) ?? 0;
    seenNames.set(item.name, nameIndex + 1);
    const name =
      (nameCounts.get(item.name) ?? 1) > 1
        ? `${item.name} (${nameIndex + 1})`
        : item.name;

    const baseId = sanitizeClipId(name);
    const idIndex = seenIds.get(baseId) ?? 0;
    seenIds.set(baseId, idIndex + 1);
    const id = idIndex > 0 ? `${baseId}#${idIndex + 1}` : baseId;

    collected.push({
      id,
      name,
      duration: Number.isFinite(item.track.duration) ? item.track.duration : 0,
      track: item.track,
    });
  }

  return collected;
}
