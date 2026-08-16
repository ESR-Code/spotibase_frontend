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
  "enableDisable",
  "changeHotspotColor",
  "changeHotspotIcon",
];

export const HOTSPOT_GRAPH_ALLOWED_NODE_TYPES: ActionNodeType[] = [
  "openModal",
  "goToScene",
  "openUrl",
  "sendPostMessage",
  "httpRequest",
  "enableDisable",
  "changeHotspotColor",
  "changeHotspotIcon",
];

export function isHotspotOwnerId(ownerId: number): boolean {
  return ownerId > 0;
}

export function isStartOwnerId(ownerId: number): boolean {
  return ownerId === APP_START_OWNER_ID || ownerId === SCENE_START_OWNER_ID;
}

/** Same lane, or App Start ↔ Scene Start (nodes can be reassigned). */
export function canConnectActionOwners(
  sourceOwnerId: number,
  targetOwnerId: number,
): boolean {
  if (sourceOwnerId === targetOwnerId) return true;
  return isStartOwnerId(sourceOwnerId) && isStartOwnerId(targetOwnerId);
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

export type FieldSourceActionNode =
  | Extract<ActionNode, { type: "httpRequest" }>
  | Extract<ActionNode, { type: "sendPostMessage" }>;

function isFieldSourceNode(node: ActionNode): node is FieldSourceActionNode {
  if (node.type === "httpRequest") return true;
  return (
    node.type === "sendPostMessage" && (node.data.mode ?? "send") === "receive"
  );
}

function fieldSourceJson(node: FieldSourceActionNode): string {
  if (node.type === "httpRequest") return node.data.lastResponseJson ?? "";
  return node.data.lastPayloadJson ?? "";
}

/** Find an HTTP / Post Message receive node by id across graphs. */
export function findHttpRequestNodeById(nodeId: string): {
  ownerId: number;
  node: FieldSourceActionNode;
  sampleJson: string;
} | null {
  const editor = useEditorStore.getState();
  for (const hotspot of editor.hotspots) {
    const node = getActionGraph(hotspot).nodes.find((n) => n.id === nodeId);
    if (node && isFieldSourceNode(node)) {
      return {
        ownerId: hotspot.id,
        node,
        sampleJson: fieldSourceJson(node),
      };
    }
  }

  const scenes = useScenesStore.getState();
  const appNode = scenes.appStartActions.nodes.find((n) => n.id === nodeId);
  if (appNode && isFieldSourceNode(appNode)) {
    return {
      ownerId: APP_START_OWNER_ID,
      node: appNode,
      sampleJson: fieldSourceJson(appNode),
    };
  }

  const scene =
    scenes.scenes.find((s) => s.id === scenes.activeSceneId) ?? scenes.scenes[0];
  const sceneNode = scene?.startActions?.nodes.find((n) => n.id === nodeId);
  if (sceneNode && isFieldSourceNode(sceneNode)) {
    return {
      ownerId: SCENE_START_OWNER_ID,
      node: sceneNode,
      sampleJson: fieldSourceJson(sceneNode),
    };
  }

  return null;
}
