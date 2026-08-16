import { create } from "zustand";
import { cloneCameraResetPosition } from "@/lib/editor/constants/default-settings";
import type { CameraResetPosition } from "@/lib/editor/types/editor-settings";

type CameraPoseClipboardState = {
  pose: CameraResetPosition | null;
  copy: (pose: CameraResetPosition) => void;
  clear: () => void;
};

/** In-app clipboard for hotspot / reset camera poses (includes preview image). */
export const useCameraPoseClipboardStore = create<CameraPoseClipboardState>(
  (set) => ({
    pose: null,
    copy: (pose) => set({ pose: cloneCameraResetPosition(pose) }),
    clear: () => set({ pose: null }),
  }),
);
