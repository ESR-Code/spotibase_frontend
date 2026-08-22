import { create } from "zustand";

export type PreviewMeshHighlight = {
  meshIds: string[];
  tintEnabled: boolean;
  tintColor: string;
  tintOpacity: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
};

type PreviewMeshHighlightState = {
  highlight: PreviewMeshHighlight | null;
  apply: (highlight: PreviewMeshHighlight) => void;
  reset: () => void;
};

/** Preview-session mesh tint/outline. Cleared when leaving Preview. */
export const usePreviewMeshHighlightStore = create<PreviewMeshHighlightState>(
  (set) => ({
    highlight: null,
    apply: (highlight) => set({ highlight }),
    reset: () => set({ highlight: null }),
  }),
);
