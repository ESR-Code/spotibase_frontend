import { create } from "zustand";

export type MeshHighlightStyle = {
  tintEnabled: boolean;
  tintColor: string;
  tintOpacity: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
};

export type MeshHighlightById = Record<string, MeshHighlightStyle>;

type PreviewMeshHighlightState = {
  byMeshId: MeshHighlightById;
  /** Paint selected meshes. Later Highlight Mesh nodes overlay earlier ones. */
  paint: (meshIds: string[], style: MeshHighlightStyle) => void;
  /** Drop highlight from selected meshes; others stay as they are. */
  restore: (meshIds: string[]) => void;
  reset: () => void;
};

/** Preview-session mesh tint/outline. Cleared when leaving Preview. */
export const usePreviewMeshHighlightStore = create<PreviewMeshHighlightState>(
  (set) => ({
    byMeshId: {},
    paint: (meshIds, style) =>
      set((state) => {
        if (meshIds.length === 0) return state;
        const byMeshId = { ...state.byMeshId };
        for (const id of meshIds) {
          byMeshId[id] = style;
        }
        return { byMeshId };
      }),
    restore: (meshIds) =>
      set((state) => {
        if (meshIds.length === 0) return state;
        const byMeshId = { ...state.byMeshId };
        let changed = false;
        for (const id of meshIds) {
          if (id in byMeshId) {
            delete byMeshId[id];
            changed = true;
          }
        }
        return changed ? { byMeshId } : state;
      }),
    reset: () => set({ byMeshId: {} }),
  }),
);
