import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import type { EnableDisableActionNode } from "@/lib/editor/types/hotspot-action";

export function validateEnableDisableData(
  _data: EnableDisableActionNode["data"],
): string | null {
  return null;
}

/**
 * Apply per-item enable state: checked (not in disabled lists) → enable,
 * unchecked → disable. Covers every hotspot/layer currently in the scene.
 */
export function applyEnableDisable(
  data: EnableDisableActionNode["data"],
): void {
  const disabledHotspots = new Set(data.disabledHotspotIds);
  const disabledLayers = new Set(data.disabledLayerIds);
  const editor = useEditorStore.getState();
  const layers = useLayersStore.getState();

  for (const hotspot of editor.hotspots) {
    const enabled = !disabledHotspots.has(hotspot.id);
    if ((hotspot.enabled ?? true) !== enabled) {
      editor.updateHotspot(hotspot.id, { enabled });
    }
  }

  for (const layer of layers.layers) {
    const visible = !disabledLayers.has(layer.id);
    if (layer.visible !== visible) {
      layers.updateLayer(layer.id, { visible });
    }
  }
}
