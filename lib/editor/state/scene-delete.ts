import { confirmDelete } from "@/lib/editor/confirm";
import { history } from "@/lib/editor/history/history-store";
import { assetIdsIn, toastUndo } from "@/lib/editor/history/snapshot";
import { readLiveScenes, useScenesStore } from "@/lib/editor/state/scenes-store";
import type { Scene } from "@/lib/editor/types/scene";

/** Undo scope for project-level scene list changes. */
export const SCENES_HISTORY_SCOPE = "scenes";

export type SceneDeleteImpact = {
  scene: Scene;
  hotspotCount: number;
  /** Go To Scene nodes elsewhere in the project that target this scene. */
  goToSceneRefs: number;
  /** Scenes whose georeference is aligned to this (geo) scene. */
  geoDependents: string[];
  /** Name of the scene that becomes primary, when this one is primary. */
  newPrimaryName: string | null;
};

function countGoToSceneRefs(value: unknown, sceneId: string): number {
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (sum, item) => sum + countGoToSceneRefs(item, sceneId),
      0,
    );
  }
  if (!value || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  let count = 0;
  if (
    record.type === "goToScene" &&
    (record.data as { sceneId?: unknown } | undefined)?.sceneId === sceneId
  ) {
    count += 1;
  }
  for (const child of Object.values(record)) {
    count += countGoToSceneRefs(child, sceneId);
  }
  return count;
}

export function sceneDeleteImpact(sceneId: string): SceneDeleteImpact | null {
  const scenes = readLiveScenes();
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) return null;
  const others = scenes.filter((s) => s.id !== sceneId);
  return {
    scene,
    hotspotCount: scene.hotspots.length,
    goToSceneRefs:
      countGoToSceneRefs(others, sceneId) +
      countGoToSceneRefs(useScenesStore.getState().appStartActions, sceneId),
    geoDependents: others
      .filter((s) => s.geoReference?.geoSceneId === sceneId)
      .map((s) => s.name),
    newPrimaryName: scene.isPrimary ? (others[0]?.name ?? null) : null,
  };
}

function describeImpact(impact: SceneDeleteImpact): string {
  const parts: string[] = [];
  const { hotspotCount, goToSceneRefs, geoDependents, newPrimaryName } = impact;
  parts.push(
    hotspotCount === 0
      ? "It has no hotspots."
      : `Its ${hotspotCount} hotspot${hotspotCount === 1 ? "" : "s"} and their actions will be removed.`,
  );
  if (newPrimaryName) {
    parts.push(`It is the primary scene; "${newPrimaryName}" becomes primary.`);
  }
  if (goToSceneRefs > 0) {
    parts.push(
      `${goToSceneRefs} Go To Scene action${goToSceneRefs === 1 ? "" : "s"} point${goToSceneRefs === 1 ? "s" : ""} here and will need a new target.`,
    );
  }
  if (geoDependents.length > 0) {
    parts.push(
      `Georeference of ${geoDependents.map((name) => `"${name}"`).join(", ")} will become invalid.`,
    );
  }
  return parts.join(" ");
}

/**
 * Ask with the real consequences, delete, and offer Undo. Undo puts the scene
 * back at its position and restores the primary flag and the georeferences
 * the delete invalidated; it does not switch scenes.
 */
export async function deleteSceneWithConfirm(sceneId: string): Promise<void> {
  const impact = sceneDeleteImpact(sceneId);
  if (!impact) return;
  const ok = await confirmDelete({
    subject: "scene",
    title: `Delete "${impact.scene.name}"?`,
    description: describeImpact(impact),
  });
  if (!ok) return;

  // Snapshot after the confirm: the live stores may have changed meanwhile.
  const before = useScenesStore.getState();
  const index = before.scenes.findIndex((s) => s.id === sceneId);
  const removed = readLiveScenes().find((s) => s.id === sceneId);
  if (index < 0 || !removed) return;
  const primaryBefore = before.scenes.find((s) => s.isPrimary)?.id ?? null;
  const geoBefore = new Map(
    before.scenes
      .filter((s) => s.geoReference?.geoSceneId === sceneId)
      .map((s) => [s.id, s.geoReference]),
  );

  before.removeScene(sceneId);
  if (useScenesStore.getState().scenes.some((s) => s.id === sceneId)) return;

  const entry = {
    label: "Delete scene",
    undo: () => {
      useScenesStore.setState((state) => {
        if (state.scenes.some((s) => s.id === sceneId)) return state;
        const scenes = [...state.scenes];
        scenes.splice(Math.min(index, scenes.length), 0, removed);
        return {
          scenes: scenes.map((s) => {
            let next = s;
            const isPrimary = primaryBefore ? s.id === primaryBefore : s.isPrimary;
            if (next.isPrimary !== isPrimary) next = { ...next, isPrimary };
            if (geoBefore.has(s.id)) {
              next = { ...next, geoReference: geoBefore.get(s.id) };
            }
            return next;
          }),
        };
      });
    },
    redo: () => {
      useScenesStore.getState().removeScene(sceneId);
    },
    // Keep the scene's media through an asset sweep while Undo is possible.
    assetIds: [
      ...assetIdsIn(JSON.stringify(removed)),
      ...(removed.model.subjectAssetId ? [removed.model.subjectAssetId] : []),
    ],
  };
  history.record(SCENES_HISTORY_SCOPE, entry);
  toastUndo(SCENES_HISTORY_SCOPE, entry, `Scene "${removed.name}" deleted`);
}
