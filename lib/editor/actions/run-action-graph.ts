import {
  APP_START_OWNER_ID,
  ownerKeyFor,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import {
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { chainFromTrigger } from "@/lib/editor/actions/graph-ops";
import {
  ACTION_NODE_META,
  type ActionRunContext,
} from "@/lib/editor/actions/registry";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import { toast } from "sonner";

export type { ActionRunContext };

/**
 * Walk an action chain from its trigger and run each node's handler.
 * Stops early if a node fails validation or returns `"stop"`.
 */
export async function runActionGraph(
  graph: HotspotActionGraph,
  ctx: ActionRunContext,
) {
  const chain = chainFromTrigger(graph);
  const visited = new Set<string>();

  for (const node of chain) {
    if (visited.has(node.id)) break;
    visited.add(node.id);

    const meta = ACTION_NODE_META[node.type];
    const error = meta.validate(node);
    if (error) {
      toast.error(`${meta.label}: ${error}`);
      break;
    }

    const result = await Promise.resolve(meta.run(node, ctx));
    if (result === "stop") break;
  }
}

export async function runHotspotActions(hotspotId: number) {
  const hotspot = useEditorStore
    .getState()
    .hotspots.find((h) => h.id === hotspotId);
  if (!hotspot) return;

  await runActionGraph(getActionGraph(hotspot), {
    hotspotId,
    ownerId: hotspotId,
    ownerKey: ownerKeyFor(hotspotId),
  });
}

export async function runAppStartActions() {
  const graph = useScenesStore.getState().appStartActions;
  await runActionGraph(graph, {
    hotspotId: null,
    ownerId: APP_START_OWNER_ID,
    ownerKey: ownerKeyFor(APP_START_OWNER_ID),
  });
}

export async function runSceneStartActions(sceneId?: string) {
  const state = useScenesStore.getState();
  const id = sceneId ?? state.activeSceneId;
  const scene = state.scenes.find((s) => s.id === id);
  if (!scene) return;

  await runActionGraph(scene.startActions ?? createEmptyActionGraph(), {
    hotspotId: null,
    ownerId: SCENE_START_OWNER_ID,
    ownerKey: ownerKeyFor(SCENE_START_OWNER_ID, id),
  });
}

/** App Start, then Scene Start for the active scene. */
export async function runPreviewStartActions() {
  await runAppStartActions();
  await runSceneStartActions();
}
