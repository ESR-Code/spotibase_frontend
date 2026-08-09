import {
  cloneActionGraph,
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { updateNodeData } from "@/lib/editor/actions/graph-ops";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type {
  ActionNode,
  ActionNodeType,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

/** Synthetic lane owner for the project-wide App Start graph. */
export const APP_START_OWNER_ID = -1;
/** Synthetic lane owner for the active scene's Scene Start graph. */
export const SCENE_START_OWNER_ID = -2;

export type ActionTriggerKind = "hotspot" | "sceneStart" | "appStart";

export const START_GRAPH_ALLOWED_NODE_TYPES: ActionNodeType[] = [
  "goToScene",
  "sendPostMessage",
  "httpRequest",
];

export const HOTSPOT_GRAPH_ALLOWED_NODE_TYPES: ActionNodeType[] = [
  "openModal",
  "goToScene",
  "openUrl",
  "sendPostMessage",
  "httpRequest",
];

export function isHotspotOwnerId(ownerId: number): boolean {
  return ownerId > 0;
}

export function triggerKindForOwner(ownerId: number): ActionTriggerKind {
  if (ownerId === APP_START_OWNER_ID) return "appStart";
  if (ownerId === SCENE_START_OWNER_ID) return "sceneStart";
  return "hotspot";
}

export function ownerKeyFor(ownerId: number, sceneId?: string): string {
  if (ownerId === APP_START_OWNER_ID) return "appStart";
  if (ownerId === SCENE_START_OWNER_ID) {
    const id =
      sceneId ?? useScenesStore.getState().activeSceneId ?? "unknown";
    return `sceneStart:${id}`;
  }
  return `h:${ownerId}`;
}

export function getOwnedActionGraph(ownerId: number): HotspotActionGraph | null {
  if (ownerId === APP_START_OWNER_ID) {
    return cloneActionGraph(useScenesStore.getState().appStartActions);
  }
  if (ownerId === SCENE_START_OWNER_ID) {
    const state = useScenesStore.getState();
    const scene =
      state.scenes.find((s) => s.id === state.activeSceneId) ?? state.scenes[0];
    if (!scene) return createEmptyActionGraph();
    return cloneActionGraph(scene.startActions ?? createEmptyActionGraph());
  }
  const hotspot = useEditorStore
    .getState()
    .hotspots.find((h) => h.id === ownerId);
  if (!hotspot) return null;
  return getActionGraph(hotspot);
}

export function setOwnedActionGraph(
  ownerId: number,
  graph: HotspotActionGraph,
): void {
  if (ownerId === APP_START_OWNER_ID) {
    useScenesStore.getState().setAppStartActions(graph);
    return;
  }
  if (ownerId === SCENE_START_OWNER_ID) {
    useScenesStore.getState().setActiveSceneStartActions(graph);
    return;
  }
  useEditorStore.getState().updateHotspot(ownerId, { actions: graph });
}

export function patchOwnedActionNodeData(
  ownerId: number,
  nodeId: string,
  patch: Record<string, unknown>,
): void {
  const graph = getOwnedActionGraph(ownerId);
  if (!graph) return;
  setOwnedActionGraph(ownerId, updateNodeData(graph, nodeId, patch));
}

export function findOwnedActionNode(
  ownerId: number,
  nodeId: string,
): ActionNode | null {
  const graph = getOwnedActionGraph(ownerId);
  return graph?.nodes.find((n) => n.id === nodeId) ?? null;
}

/** Find an HTTP request node by id across hotspot + start graphs. */
export function findHttpRequestNodeById(nodeId: string): {
  ownerId: number;
  node: Extract<ActionNode, { type: "httpRequest" }>;
} | null {
  const editor = useEditorStore.getState();
  for (const hotspot of editor.hotspots) {
    const node = getActionGraph(hotspot).nodes.find((n) => n.id === nodeId);
    if (node?.type === "httpRequest") {
      return { ownerId: hotspot.id, node };
    }
  }

  const scenes = useScenesStore.getState();
  const appNode = scenes.appStartActions.nodes.find((n) => n.id === nodeId);
  if (appNode?.type === "httpRequest") {
    return { ownerId: APP_START_OWNER_ID, node: appNode };
  }

  const scene =
    scenes.scenes.find((s) => s.id === scenes.activeSceneId) ?? scenes.scenes[0];
  const sceneNode = scene?.startActions?.nodes.find((n) => n.id === nodeId);
  if (sceneNode?.type === "httpRequest") {
    return { ownerId: SCENE_START_OWNER_ID, node: sceneNode };
  }

  return null;
}
