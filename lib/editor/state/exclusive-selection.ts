import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function selectHotspotExclusive(id: number | null) {
  useEditorStore.getState().selectHotspot(id);
  useLayersStore.getState().setSelectedId(null);
  useUIStore.getState().setDialogEditorId(null);
}

export function selectLayerExclusive(id: string | null) {
  useLayersStore.getState().setSelectedId(id);
  useEditorStore.getState().selectHotspot(null);
  useUIStore.getState().setDialogEditorId(null);
}

/** Open a scene dialog in its editor drawer (closes the hotspot drawer). */
export function selectDialogExclusive(id: string | null) {
  useEditorStore.getState().selectHotspot(null);
  useLayersStore.getState().setSelectedId(null);
  useUIStore.getState().setPropertiesDrawerOpen(false);
  useUIStore.getState().setDialogEditorId(id);
}

export function clearEditorSelection() {
  useEditorStore.getState().selectHotspot(null);
  useLayersStore.getState().setSelectedId(null);
  useUIStore.getState().setDialogEditorId(null);
}
