import { collectAssetRefs } from "@/lib/editor/assets/collect-asset-refs";
import { historyAssetIds } from "@/lib/editor/history/history-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { readLiveScenes, useScenesStore } from "@/lib/editor/state/scenes-store";

/** Every asset the live (possibly unsaved) editor state references. */
export function readLiveAssetRefs() {
  return collectAssetRefs({
    scenes: readLiveScenes(),
    project: {
      appStartActions: useScenesStore.getState().appStartActions,
      generalStyle: useGeneralSettingsStore.getState().style,
    },
  });
}

/**
 * Ids the asset sweep must keep on top of the saved draft: whatever the live
 * editor references, plus whatever undo / redo could put back.
 */
export function liveAssetKeepIds(): string[] {
  const ids = new Set<string>(
    [...readLiveAssetRefs().keys()].map((id) => id.toLowerCase()),
  );
  for (const id of historyAssetIds()) ids.add(id);
  return [...ids];
}
