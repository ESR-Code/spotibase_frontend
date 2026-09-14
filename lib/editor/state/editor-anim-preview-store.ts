import { create } from "zustand";

type EditorAnimPreviewState = {
  clipId: string | null;
  playing: boolean;
  currentTime: number;
  setClipId: (clipId: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (currentTime: number) => void;
  /**
   * Idle the transport (time 0, not playing). Pass a clip id to keep or
   * replace the selection; pass `null` to clear it; omit to keep the current clip.
   */
  reset: (clipId?: string | null) => void;
};

/** Editor-session GLB pose transport. Not snapshotted onto the Scene. */
export const useEditorAnimPreviewStore = create<EditorAnimPreviewState>(
  (set) => ({
    clipId: null,
    playing: false,
    currentTime: 0,
    setClipId: (clipId) => set({ clipId }),
    setPlaying: (playing) => set({ playing }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    reset: (clipId) =>
      set((state) => ({
        clipId: clipId === undefined ? state.clipId : clipId,
        playing: false,
        currentTime: 0,
      })),
  }),
);
