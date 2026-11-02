import { hydrateProject } from "@/lib/editor/persist/hydrate";
import { setViewerRuntime } from "@/lib/editor/runtime";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { resolveInitialLegendCategory } from "@/lib/editor/types/legend-category";
import type { PublishedProject } from "@/lib/viewer/snapshot";

/**
 * Loads a published project into the shared editor stores for the viewer.
 * Unlike the editor loader there is no persistence binding, no asset GC and no
 * Data API: the snapshot is the whole project. Call before the viewport mounts;
 * Preview is entered later, once the viewport listeners exist
 * (`whenViewportReady` → `enterPreview`).
 */
export function bootViewerProject(
  project: PublishedProject,
  options: { token: string | null; sceneSlug: string | null },
): void {
  setViewerRuntime({ projectId: project.projectId, token: options.token });
  hydrateProject({
    projectId: project.projectId,
    editorData: project.editorData,
    sceneRows: project.sceneRows,
    assets: project.assets,
  });

  // `?scene=<slug>` deep link; slugs are stable once a scene has been saved.
  if (options.sceneSlug) {
    const slug = options.sceneSlug.toLowerCase();
    const store = useScenesStore.getState();
    const target = store.scenes.find((scene) => scene.slug?.toLowerCase() === slug);
    if (target && target.id !== store.activeSceneId) store.switchScene(target.id);
  }
}

/**
 * Enter Preview exactly once, the way the editor's Preview button does
 * (initial legend category, collapsed chrome), then App Start / Scene Start run.
 */
export function enterViewerPreview(): void {
  const ui = useUIStore.getState();
  ui.closeAllOverlays();
  ui.setOutlinerCollapsed(true);
  ui.setLegendFilterCategory(
    resolveInitialLegendCategory(useSettingsStore.getState()),
  );
  useEditorStore.getState().enterPreview();
}
