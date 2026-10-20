import { create } from "zustand";

type PreviewVisibilityState = {
  disabledHotspotIds: number[];
  disabledLayerIds: string[];
  disabledMeshIds: string[];
  apply: (hotspotIds: number[], layerIds: string[]) => void;
  applyMeshes: (meshIds: string[]) => void;
  reset: () => void;
};

/** Preview-session overlay. Cleared when leaving Preview; never written to the scene. */
export const usePreviewVisibilityStore = create<PreviewVisibilityState>(
  (set) => ({
    disabledHotspotIds: [],
    disabledLayerIds: [],
    disabledMeshIds: [],
    apply: (disabledHotspotIds, disabledLayerIds) =>
      set({ disabledHotspotIds, disabledLayerIds }),
    applyMeshes: (disabledMeshIds) => set({ disabledMeshIds }),
    reset: () =>
      set({ disabledHotspotIds: [], disabledLayerIds: [], disabledMeshIds: [] }),
  }),
);

export function isPreviewHotspotEnabled(
  isPreview: boolean,
  hotspotId: number,
): boolean {
  if (!isPreview) return true;
  return !disabledHotspotSet().has(hotspotId);
}

// Called per hotspot per frame by the 3D loop; rebuilt only when the list changes.
let disabledIdsSource: number[] | null = null;
let disabledIdsSet = new Set<number>();

function disabledHotspotSet(): Set<number> {
  const ids = usePreviewVisibilityStore.getState().disabledHotspotIds;
  if (ids !== disabledIdsSource) {
    disabledIdsSource = ids;
    disabledIdsSet = new Set(ids);
  }
  return disabledIdsSet;
}

export function isPreviewLayerVisible(
  isPreview: boolean,
  layerId: string,
  authoredVisible: boolean,
): boolean {
  if (!authoredVisible) return false;
  if (!isPreview) return true;
  return !usePreviewVisibilityStore
    .getState()
    .disabledLayerIds.includes(layerId);
}
