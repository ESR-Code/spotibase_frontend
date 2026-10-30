import type { MarkerDialogSize } from "@/lib/editor/types/editor-settings";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";

/** Presentations a scene dialog can use (no infobox: it has no anchor). */
export type SceneDialogPresentation = "modal" | "drawer";

/**
 * Standalone Preview dialog owned by a scene, not a hotspot. Shown by an
 * Open Modal node whose `dialogId` points at it (Scene Start, menu buttons,
 * Action buttons, hotspot clicks). Content uses the hotspot block system.
 */
export type SceneDialog = {
  /** uuid; Open Modal nodes reference it. */
  id: string;
  title: string;
  /** Optional header image: `asset:<id>`, URL or `{{token}}`; empty = none. */
  image: string;
  blocks: HotspotBlock[];
  /** Unset = the scene's marker dialog presentation (infobox falls back to modal). */
  presentation?: SceneDialogPresentation;
  /** Unset = the scene's marker dialog size. */
  size?: MarkerDialogSize;
  /**
   * Open at most once per Preview session. Later Open Modal runs skip the
   * dialog and continue with its onClose branch, as if it was dismissed.
   */
  showOncePerSession?: boolean;
};
