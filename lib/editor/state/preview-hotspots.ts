import { useMemo } from "react";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewSpawnedHotspotsStore } from "@/lib/editor/state/preview-spawned-hotspots-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";

/** Authored hotspots plus Preview-session spawned markers. */
export function listPreviewHotspots(): Hotspot[] {
  const authored = useEditorStore.getState().hotspots;
  const spawned = usePreviewSpawnedHotspotsStore.getState().list();
  if (spawned.length === 0) return authored;
  return [...authored, ...spawned];
}

export function findHotspot(id: number): Hotspot | undefined {
  return (
    useEditorStore.getState().hotspots.find((hotspot) => hotspot.id === id) ??
    usePreviewSpawnedHotspotsStore.getState().find(id)
  );
}

export function findHotspotIndex(id: number): number {
  return listPreviewHotspots().findIndex((hotspot) => hotspot.id === id);
}

/** Subscribe to authored + spawned hotspots for Preview UI. */
export function usePreviewHotspots(): Hotspot[] {
  const authored = useEditorStore((s) => s.hotspots);
  const bySource = usePreviewSpawnedHotspotsStore((s) => s.bySource);
  return useMemo(() => {
    const spawned = Object.values(bySource).flat();
    return spawned.length === 0 ? authored : [...authored, ...spawned];
  }, [authored, bySource]);
}
