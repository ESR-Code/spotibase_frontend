import { create } from "zustand";
import type { EditorAsset } from "@/lib/editor/assets/types";

/**
 * Project-level media library. Not per scene and not part of the scene
 * snapshot/hydrate path: assets are shared by every scene of the project.
 */
type AssetsState = {
  /** Project the editor is bound to; `null` until the project loads. */
  projectId: string | null;
  assets: Record<string, EditorAsset>;
  /** Uploads in flight; saving waits until this is 0. */
  pendingUploads: number;
  beginUpload: () => void;
  endUpload: () => void;
  setProject: (projectId: string | null, assets: EditorAsset[]) => void;
  upsertAsset: (asset: EditorAsset) => void;
  patchAsset: (id: string, patch: Partial<Pick<EditorAsset, "name">>) => void;
  removeAsset: (id: string) => void;
};

export const useAssetsStore = create<AssetsState>((set) => ({
  projectId: null,
  assets: {},
  pendingUploads: 0,
  beginUpload: () => set((state) => ({ pendingUploads: state.pendingUploads + 1 })),
  endUpload: () =>
    set((state) => ({ pendingUploads: Math.max(0, state.pendingUploads - 1) })),
  setProject: (projectId, assets) =>
    set({
      projectId,
      assets: Object.fromEntries(assets.map((asset) => [asset.id, asset])),
    }),
  upsertAsset: (asset) =>
    set((state) => ({ assets: { ...state.assets, [asset.id]: asset } })),
  patchAsset: (id, patch) =>
    set((state) => {
      const current = state.assets[id];
      if (!current) return state;
      return { assets: { ...state.assets, [id]: { ...current, ...patch } } };
    }),
  removeAsset: (id) =>
    set((state) => {
      if (!state.assets[id]) return state;
      const next = { ...state.assets };
      delete next[id];
      return { assets: next };
    }),
}));

export function getAsset(id: string): EditorAsset | undefined {
  return useAssetsStore.getState().assets[id];
}

export function requireEditorProjectId(): string {
  const projectId = useAssetsStore.getState().projectId;
  if (!projectId) throw new Error("The editor is not bound to a project.");
  return projectId;
}
