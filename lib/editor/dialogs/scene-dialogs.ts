import {
  LEGEND_OWNER_ID,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import {
  cloneSceneDialogs,
  listButtonBlocks,
  listDialogButtonBlocks,
} from "@/lib/editor/blocks/content-buttons";
import { runSnapshotChange } from "@/lib/editor/history/snapshot";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type { Scene } from "@/lib/editor/types/scene";
import type { SceneDialog } from "@/lib/editor/types/scene-dialog";
import { createUuid } from "@/lib/editor/utils/uuid";

const EMPTY_DIALOGS: SceneDialog[] = [];

function activeScene(): Scene | null {
  const state = useScenesStore.getState();
  return (
    state.scenes.find((scene) => scene.id === state.activeSceneId) ??
    state.scenes[0] ??
    null
  );
}

/** History scope for dialog add / delete / duplicate in one scene. */
export function sceneDialogsHistoryScope(sceneId: string): string {
  return `dialogs:${sceneId}`;
}

export function listActiveSceneDialogs(): SceneDialog[] {
  return activeScene()?.dialogs ?? EMPTY_DIALOGS;
}

export function findActiveSceneDialog(id: string): SceneDialog | null {
  return listActiveSceneDialogs().find((dialog) => dialog.id === id) ?? null;
}

/** Live dialogs of the active scene. */
export function useActiveSceneDialogs(): SceneDialog[] {
  return useScenesStore(
    (state) =>
      (
        state.scenes.find((scene) => scene.id === state.activeSceneId) ??
        state.scenes[0]
      )?.dialogs ?? EMPTY_DIALOGS,
  );
}

export function useActiveSceneDialog(id: string | null): SceneDialog | null {
  const dialogs = useActiveSceneDialogs();
  return id ? (dialogs.find((dialog) => dialog.id === id) ?? null) : null;
}

function writeSceneDialogs(sceneId: string, dialogs: SceneDialog[]): void {
  useScenesStore.setState((state) => ({
    scenes: state.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, dialogs } : scene,
    ),
  }));
}

/** Record a dialog-list change of the active scene for Undo. */
function changeDialogs(
  label: string,
  apply: (dialogs: SceneDialog[]) => SceneDialog[],
  toast?: string,
): void {
  const scene = activeScene();
  if (!scene) return;
  const sceneId = scene.id;
  const read = () =>
    useScenesStore.getState().scenes.find((s) => s.id === sceneId)?.dialogs ??
    EMPTY_DIALOGS;
  runSnapshotChange({
    scope: sceneDialogsHistoryScope(sceneId),
    label,
    capture: () => cloneSceneDialogs(read()),
    apply: () => writeSceneDialogs(sceneId, apply(read())),
    restore: (target) => writeSceneDialogs(sceneId, cloneSceneDialogs(target)),
    toast,
  });
}

function nextDialogTitle(dialogs: SceneDialog[]): string {
  const taken = new Set(dialogs.map((dialog) => dialog.title));
  let n = dialogs.length + 1;
  while (taken.has(`Dialog ${n}`)) n++;
  return `Dialog ${n}`;
}

export function createSceneDialog(
  data: Partial<Omit<SceneDialog, "id">> = {},
): SceneDialog {
  return {
    id: createUuid(),
    title: data.title ?? "Dialog",
    image: data.image ?? "",
    blocks: data.blocks ?? [],
    ...(data.presentation ? { presentation: data.presentation } : {}),
    ...(data.size ? { size: data.size } : {}),
  };
}

/** Append a new empty dialog to the active scene; returns it. */
export function addSceneDialog(
  data: Partial<Omit<SceneDialog, "id">> = {},
): SceneDialog {
  const dialog = createSceneDialog({
    title: nextDialogTitle(listActiveSceneDialogs()),
    ...data,
  });
  changeDialogs("Add dialog", (dialogs) => [...dialogs, dialog]);
  return dialog;
}

/** Field edits (title, image, blocks, presentation). Not recorded in history. */
export function updateSceneDialog(
  id: string,
  patch: Partial<Omit<SceneDialog, "id">>,
): void {
  const scene = activeScene();
  if (!scene) return;
  writeSceneDialogs(
    scene.id,
    scene.dialogs.map((dialog) =>
      dialog.id === id ? { ...dialog, ...patch } : dialog,
    ),
  );
}

/** Deleted with an Undo toast; Open Modal nodes that used it show a warning. */
export function removeSceneDialog(id: string): void {
  const dialog = findActiveSceneDialog(id);
  if (!dialog) return;
  const refs = listSceneDialogReferences(id).length;
  const name = dialog.title.trim() || "Dialog";
  changeDialogs(
    "Delete dialog",
    (dialogs) => dialogs.filter((item) => item.id !== id),
    refs > 0
      ? `Deleted “${name}”. ${refs} Open Modal node${refs === 1 ? "" : "s"} now need${refs === 1 ? "s" : ""} a dialog.`
      : `Deleted “${name}”`,
  );
}

/** Copy below the source. Action buttons get new owners (fresh lanes). */
export function duplicateSceneDialog(id: string): SceneDialog | null {
  const source = findActiveSceneDialog(id);
  if (!source) return null;
  const [copy] = cloneSceneDialogs([source], true);
  const dialog: SceneDialog = {
    ...copy!,
    id: createUuid(),
    title: `${source.title} (copy)`,
  };
  changeDialogs("Duplicate dialog", (dialogs) => {
    const index = dialogs.findIndex((item) => item.id === id);
    const next = [...dialogs];
    next.splice(index + 1, 0, dialog);
    return next;
  });
  return dialog;
}

/** Presentation with the scene fallback applied (infobox has no anchor → modal). */
export function resolveSceneDialogPresentation(
  dialog: SceneDialog,
  scenePresentation: "modal" | "drawer" | "infobox",
): "modal" | "drawer" {
  if (dialog.presentation) return dialog.presentation;
  return scenePresentation === "infobox" ? "modal" : scenePresentation;
}

/** Graph that opens a dialog, named for the "Used by" list. */
export type SceneDialogReference = { ownerId: number; label: string };

/** Open Modal nodes in the active scene's graphs that show this dialog. */
export function listSceneDialogReferences(id: string): SceneDialogReference[] {
  const scene = activeScene();
  if (!scene) return [];
  const hotspots = useEditorStore.getState().hotspots;
  const owners: Array<{ ownerId: number; label: string; graph: HotspotActionGraph }> = [
    { ownerId: SCENE_START_OWNER_ID, label: "Scene Start", graph: scene.startActions },
    { ownerId: LEGEND_OWNER_ID, label: "Legend", graph: scene.legendActions },
  ];
  for (const button of useSettingsStore.getState().customMenuButtons) {
    owners.push({
      ownerId: button.ownerId,
      label: `Menu button: ${button.tooltip.trim() || "Custom button"}`,
      graph: button.actions,
    });
  }
  for (const hotspot of hotspots) {
    owners.push({
      ownerId: hotspot.id,
      label: hotspot.title,
      graph: getActionGraph(hotspot),
    });
  }
  const buttons = [
    ...listButtonBlocks(hotspots).map(({ hotspot, block }) => ({
      title: hotspot.title,
      block,
    })),
    ...listDialogButtonBlocks(scene.dialogs).map(({ dialog, block }) => ({
      title: dialog.title,
      block,
    })),
  ];
  for (const { title, block } of buttons) {
    owners.push({
      ownerId: block.ownerId,
      label: `${title}: ${block.label.trim() || "Action button"}`,
      graph: block.actions,
    });
  }
  return owners
    .filter(({ graph }) =>
      (graph?.nodes ?? []).some(
        (node) => node.type === "openModal" && node.data.dialogId === id,
      ),
    )
    .map(({ ownerId, label }) => ({ ownerId, label }));
}
