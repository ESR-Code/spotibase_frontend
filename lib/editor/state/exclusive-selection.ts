import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";

export function selectHotspotExclusive(id: number | null) {
  useEditorStore.getState().selectHotspot(id);
  useLayersStore.getState().setSelectedId(null);
}

export function selectLayerExclusive(id: string | null) {
  useLayersStore.getState().setSelectedId(id);
  useEditorStore.getState().selectHotspot(null);
}

export function clearEditorSelection() {
  useEditorStore.getState().selectHotspot(null);
  useLayersStore.getState().setSelectedId(null);
}
