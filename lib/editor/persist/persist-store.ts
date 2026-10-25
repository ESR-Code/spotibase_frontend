import { create } from "zustand";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import { collectOrphanAssets } from "@/lib/editor/assets/api";
import { liveAssetKeepIds } from "@/lib/editor/assets/live-asset-refs";
import {
  fetchEditorRevision,
  ProjectConflictError,
  saveEditorProject,
} from "@/lib/editor/persist/api";
import { fingerprintProject, serializeProject } from "@/lib/editor/persist/serialize";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useEffectsStore } from "@/lib/editor/state/effects-store";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { toast } from "@/lib/editor/toast";

export type SaveStatus = "idle" | "saving" | "error" | "conflict";

type PersistState = {
  projectId: string | null;
  projectName: string;
  revision: number;
  dirty: boolean;
  status: SaveStatus;
  lastSavedAt: number | null;
  error: string | null;
};

/** Editor ↔ DB binding for the open project (session chrome, not authored data). */
export const useProjectPersistStore = create<PersistState>(() => ({
  projectId: null,
  projectName: "",
  revision: 0,
  dirty: false,
  status: "idle",
  lastSavedAt: null,
  error: null,
}));

let baseline = "";
let checkTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribers: (() => void)[] = [];

const DIRTY_CHECK_MS = 400;

function scheduleDirtyCheck() {
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    checkTimer = null;
    if (!useProjectPersistStore.getState().projectId) return;
    const dirty = fingerprintProject(serializeProject()) !== baseline;
    if (dirty !== useProjectPersistStore.getState().dirty) {
      useProjectPersistStore.setState({ dirty });
    }
  }, DIRTY_CHECK_MS);
}

/**
 * Unsaved changes right now, without waiting for the debounced check: an edit
 * made less than `DIRTY_CHECK_MS` ago still counts. Use for leave / publish guards.
 */
export function hasUnsavedChanges(): boolean {
  const state = useProjectPersistStore.getState();
  if (!state.projectId) return false;
  if (state.dirty || state.status === "saving") return true;
  if (!checkTimer) return false;
  return fingerprintProject(serializeProject()) !== baseline;
}

/** Only authored fields; selection, hover, fps, etc. must not mark dirty. */
function watchAuthoredStores() {
  return [
    useEditorStore.subscribe((s, p) => {
      if (s.hotspots !== p.hotspots || s.nextId !== p.nextId) scheduleDirtyCheck();
    }),
    useModelStore.subscribe((s, p) => {
      if (
        s.modelName !== p.modelName ||
        s.hasUserModel !== p.hasUserModel ||
        s.modelScale !== p.modelScale ||
        s.modelRotation !== p.modelRotation ||
        s.modelOffsetY !== p.modelOffsetY ||
        s.modelReflection !== p.modelReflection ||
        s.subjectAssetId !== p.subjectAssetId
      ) {
        scheduleDirtyCheck();
      }
    }),
    useScenesStore.subscribe(scheduleDirtyCheck),
    useSettingsStore.subscribe(scheduleDirtyCheck),
    useEnvironmentStore.subscribe(scheduleDirtyCheck),
    useEffectsStore.subscribe(scheduleDirtyCheck),
    useGeoStore.subscribe(scheduleDirtyCheck),
    useLayersStore.subscribe((s, p) => {
      if (s.layers !== p.layers) scheduleDirtyCheck();
    }),
    useGeneralSettingsStore.subscribe(scheduleDirtyCheck),
  ];
}

/** Call right after `hydrateProject`: the loaded state becomes the clean baseline. */
export function bindPersistedProject(input: {
  projectId: string;
  projectName: string;
  revision: number;
}) {
  unbindPersistedProject();
  baseline = fingerprintProject(serializeProject());
  useProjectPersistStore.setState({
    ...input,
    dirty: false,
    status: "idle",
    lastSavedAt: null,
    error: null,
  });
  unsubscribers = watchAuthoredStores();
}

export function unbindPersistedProject() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = null;
  useProjectPersistStore.setState({ projectId: null, dirty: false, status: "idle" });
}

/**
 * Conflict resolution "keep mine": adopt the newest saved revision and save
 * this editor's state over it. Whatever the other session saved is replaced
 * (scenes it added and this editor does not have are deleted by the save).
 */
export async function overwriteSavedProject(): Promise<boolean> {
  const persist = useProjectPersistStore.getState();
  if (!persist.projectId || persist.status !== "conflict") return false;
  let revision: number | null;
  try {
    revision = await fetchEditorRevision(persist.projectId);
  } catch {
    revision = null;
  }
  if (revision == null) {
    toast.error("Could not read the saved project", {
      description: "Check your connection and try again.",
    });
    return false;
  }
  useProjectPersistStore.setState({ revision, status: "idle", error: null });
  return saveProject();
}

export async function saveProject(): Promise<boolean> {
  const persist = useProjectPersistStore.getState();
  if (!persist.projectId || persist.status === "saving") return false;
  if (persist.status === "conflict") {
    toast.error("This project changed elsewhere", {
      description: "Open the “Saved elsewhere” menu to download, overwrite, or reload.",
    });
    return false;
  }
  if (useAssetsStore.getState().pendingUploads > 0) {
    toast.message("Uploads are still running", {
      description: "Save again once they finish.",
    });
    return false;
  }

  const payload = serializeProject();
  useProjectPersistStore.setState({ status: "saving", error: null });
  try {
    const revision = await saveEditorProject({
      projectId: persist.projectId,
      expectedRevision: persist.revision,
      editorData: payload.editorData,
      scenes: payload.scenes,
    });

    const slugs = new Map(payload.scenes.map((row) => [row.id, row.slug]));
    useScenesStore.setState((state) => ({
      scenes: state.scenes.map((scene) => {
        const slug = slugs.get(scene.id);
        return slug && slug !== scene.slug ? { ...scene, slug } : scene;
      }),
    }));
    baseline = fingerprintProject(payload);
    useProjectPersistStore.setState({
      revision,
      status: "idle",
      lastSavedAt: Date.now(),
    });
    scheduleDirtyCheck();
    toast.success("Project saved");
    void collectOrphanAssets(persist.projectId, liveAssetKeepIds());
    return true;
  } catch (error) {
    if (error instanceof ProjectConflictError) {
      useProjectPersistStore.setState({ status: "conflict", error: error.message });
      toast.error("Not saved: this project changed elsewhere", {
        description: "Open the “Saved elsewhere” menu to download, overwrite, or reload.",
      });
      return false;
    }
    const message = error instanceof Error ? error.message : "Could not save the project";
    useProjectPersistStore.setState({ status: "error", error: message });
    toast.error("Could not save the project", { description: message });
    return false;
  }
}
