import { create } from "zustand";
import {
  cloneActionFence,
  cloneActionFences,
  newActionFenceId,
  type ActionFence,
} from "@/lib/editor/types/action-fence";
import { ACTION_FENCE_COLORS } from "@/lib/editor/types/action-fence";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

type ActionFencesState = {
  byScope: Record<string, ActionFence[]>;
  pendingCreate: number;
  requestCreateFence: () => void;
  consumeCreateFence: () => boolean;
  getFences: (scopeKey: string) => ActionFence[];
  setFences: (scopeKey: string, fences: ActionFence[]) => void;
  addFence: (scopeKey: string, fence: ActionFence) => void;
  updateFence: (scopeKey: string, id: string, patch: Partial<ActionFence>) => void;
  removeFence: (scopeKey: string, id: string) => void;
  applyMemberships: (
    scopeKey: string,
    changes: Array<{ nodeId: string; fenceId: string | null }>,
  ) => void;
  hydrateScope: (scopeKey: string, fences: ActionFence[]) => void;
  takeHotspotFences: () => ActionFence[];
};

function persistSceneScope(scopeKey: string, fences: ActionFence[]): void {
  if (!scopeKey.startsWith("scene:")) return;
  const sceneId = scopeKey.slice("scene:".length);
  useScenesStore.setState((state) => ({
    scenes: state.scenes.map((scene) =>
      scene.id === sceneId
        ? { ...scene, actionFences: cloneActionFences(fences) }
        : scene,
    ),
  }));
}

export function createActionFence(
  scopeKey: string,
  partial?: Partial<ActionFence>,
): ActionFence {
  const count = useActionFencesStore.getState().getFences(scopeKey).length;
  const color =
    ACTION_FENCE_COLORS[count % ACTION_FENCE_COLORS.length] ??
    ACTION_FENCE_COLORS[0];
  return {
    id: newActionFenceId(),
    name: `Fence ${count + 1}`,
    color,
    x: 80,
    y: 40,
    width: 440,
    height: 300,
    memberIds: [],
    ...partial,
  };
}

export const useActionFencesStore = create<ActionFencesState>((set, get) => ({
  byScope: {},
  pendingCreate: 0,

  requestCreateFence: () => {
    set((state) => ({ pendingCreate: state.pendingCreate + 1 }));
  },

  consumeCreateFence: () => {
    if (get().pendingCreate <= 0) return false;
    set({ pendingCreate: 0 });
    return true;
  },

  getFences: (scopeKey) => get().byScope[scopeKey] ?? [],

  setFences: (scopeKey, fences) => {
    const next = cloneActionFences(fences);
    set((state) => ({
      byScope: { ...state.byScope, [scopeKey]: next },
    }));
    persistSceneScope(scopeKey, next);
  },

  addFence: (scopeKey, fence) => {
    const claimed = new Set(fence.memberIds);
    const next = get()
      .getFences(scopeKey)
      .map((existing) => {
        const memberIds = existing.memberIds.filter((id) => !claimed.has(id));
        return memberIds.length === existing.memberIds.length
          ? existing
          : cloneActionFence({ ...existing, memberIds });
      });
    next.push(cloneActionFence(fence));
    get().setFences(scopeKey, next);
  },

  updateFence: (scopeKey, id, patch) => {
    const next = get()
      .getFences(scopeKey)
      .map((fence) =>
        fence.id === id ? cloneActionFence({ ...fence, ...patch }) : fence,
      );
    get().setFences(scopeKey, next);
  },

  removeFence: (scopeKey, id) => {
    const next = get()
      .getFences(scopeKey)
      .filter((fence) => fence.id !== id);
    get().setFences(scopeKey, next);
  },

  applyMemberships: (scopeKey, changes) => {
    if (changes.length === 0) return;
    const assign = new Map(
      changes.map((change) => [change.nodeId, change.fenceId]),
    );
    const next = get()
      .getFences(scopeKey)
      .map((fence) => {
        let memberIds = fence.memberIds.filter((id) => {
          if (!assign.has(id)) return true;
          return assign.get(id) === fence.id;
        });
        for (const [nodeId, fenceId] of assign) {
          if (fenceId === fence.id && !memberIds.includes(nodeId)) {
            memberIds = [...memberIds, nodeId];
          }
        }
        if (
          memberIds.length === fence.memberIds.length &&
          memberIds.every((id, index) => id === fence.memberIds[index])
        ) {
          return fence;
        }
        return cloneActionFence({ ...fence, memberIds });
      });
    get().setFences(scopeKey, next);
  },

  hydrateScope: (scopeKey, fences) => {
    set((state) => ({
      byScope: {
        ...state.byScope,
        [scopeKey]: cloneActionFences(fences),
      },
    }));
  },

  takeHotspotFences: () => {
    const leftover: ActionFence[] = [];
    const byScope = { ...get().byScope };
    let changed = false;
    for (const key of Object.keys(byScope)) {
      if (!key.startsWith("hotspot:")) continue;
      leftover.push(...(byScope[key] ?? []));
      delete byScope[key];
      changed = true;
    }
    if (changed) set({ byScope });
    return leftover.map(cloneActionFence);
  },
}));
