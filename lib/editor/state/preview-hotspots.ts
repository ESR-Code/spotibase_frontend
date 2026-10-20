import { useMemo } from "react";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewSpawnedHotspotsStore } from "@/lib/editor/state/preview-spawned-hotspots-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";

/** Authored hotspots plus Preview-session spawned markers. */
export function listPreviewHotspots(): Hotspot[] {
  const authored = useEditorStore.getState().hotspots;
  const spawned = usePreviewSpawnedHotspotsStore.getState().list();
  if (spawned.length === 0) return authored;
  // Called every frame by the 3D loop; both inputs are immutable arrays.
  if (authored !== combinedAuthored || spawned !== combinedSpawned) {
    combinedAuthored = authored;
    combinedSpawned = spawned;
    combined = [...authored, ...spawned];
  }
  return combined;
}

let combinedAuthored: Hotspot[] | null = null;
let combinedSpawned: Hotspot[] | null = null;
let combined: Hotspot[] = [];

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
    const spawned = Object.values(bySource).flatMap((entries) =>
      entries.map((entry) => entry.hotspot),
    );
    return spawned.length === 0 ? authored : [...authored, ...spawned];
  }, [authored, bySource]);
}
