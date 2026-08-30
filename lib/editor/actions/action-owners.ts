import {
  findCustomMenuButtonByOwnerId,
  isMenuButtonOwnerId,
  listCustomMenuButtonGraphs,
} from "@/lib/editor/actions/custom-menu-buttons";
import {
  cloneActionGraph,
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { updateNodeData } from "@/lib/editor/actions/graph-ops";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  syncActiveSceneSettings,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type {
  ActionNode,
  ActionNodeType,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

export { isMenuButtonOwnerId } from "@/lib/editor/actions/custom-menu-buttons";

/** Synthetic lane owner for the project-wide App Start graph. */
export const APP_START_OWNER_ID = -1;
/** Synthetic lane owner for the active scene's Scene Start graph. */
export const SCENE_START_OWNER_ID = -2;

export type ActionTriggerKind =
  | "hotspot"
  | "sceneStart"
  | "appStart"
  | "menuButton";

export const START_GRAPH_ALLOWED_NODE_TYPES: ActionNodeType[] = [
  "goToScene",
  "goToHotspot",
  "sendPostMessage",
  "httpRequest",
  "enableDisable",
  "enableDisableMesh",
  "highlightMesh",
  "changeHotspotColor",
  "changeHotspotIcon",
  "changeHotspotNumberTitle",
  "forEach",
  "spawnHotspots",
];

export const HOTSPOT_GRAPH_ALLOWED_NODE_TYPES: ActionNodeType[] = [
  "openModal",
  "goToScene",
  "goToHotspot",
  "openUrl",
  "sendPostMessage",
  "httpRequest",
  "enableDisable",
  "enableDisableMesh",
  "highlightMesh",
  "changeHotspotColor",
  "changeHotspotIcon",
  "changeHotspotNumberTitle",
  "forEach",
  "spawnHotspots",
];

/** Click triggers on the Preview bottom bar — no hotspot-owned Open Modal. */
export const MENU_BUTTON_GRAPH_ALLOWED_NODE_TYPES: ActionNodeType[] = [
  "goToScene",
  "goToHotspot",
  "openUrl",
  "sendPostMessage",
  "httpRequest",
  "enableDisable",
  "enableDisableMesh",
  "highlightMesh",
  "changeHotspotColor",
  "changeHotspotIcon",
  "changeHotspotNumberTitle",
  "forEach",
  "spawnHotspots",
];

export function isHotspotOwnerId(ownerId: number): boolean {
  return ownerId > 0;
}

export function isStartOwnerId(ownerId: number): boolean {
  return ownerId === APP_START_OWNER_ID || ownerId === SCENE_START_OWNER_ID;
}

/** App Start, Scene Start, or a custom bottom-menu button. */
export function isStartOrMenuOwnerId(ownerId: number): boolean {
  return isStartOwnerId(ownerId) || isMenuButtonOwnerId(ownerId);
}

/**
 * Same lane, or pull a node into App Start / Scene Start / a menu button.
 * Hotspot lanes stay isolated from each other.
 */
export function canConnectActionOwners(
  sourceOwnerId: number,
  targetOwnerId: number,
): boolean {
  if (sourceOwnerId === targetOwnerId) return true;
  return isStartOrMenuOwnerId(sourceOwnerId);
}

export function triggerKindForOwner(ownerId: number): ActionTriggerKind {
  if (ownerId === APP_START_OWNER_ID) return "appStart";
  if (ownerId === SCENE_START_OWNER_ID) return "sceneStart";
  if (isMenuButtonOwnerId(ownerId)) return "menuButton";
  return "hotspot";
}

export function ownerKeyFor(ownerId: number, sceneId?: string): string {
  if (ownerId === APP_START_OWNER_ID) return "appStart";
  if (ownerId === SCENE_START_OWNER_ID) {
    const id =
      sceneId ?? useScenesStore.getState().activeSceneId ?? "unknown";
    return `sceneStart:${id}`;
  }
  if (isMenuButtonOwnerId(ownerId)) {
    const id =
      sceneId ?? useScenesStore.getState().activeSceneId ?? "unknown";
    return `menuButton:${id}:${ownerId}`;
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
  if (isMenuButtonOwnerId(ownerId)) {
    const button = findCustomMenuButtonByOwnerId(ownerId);
    if (!button) return null;
    return cloneActionGraph(button.actions);
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
  if (isMenuButtonOwnerId(ownerId)) {
    const buttons = useSettingsStore.getState().customMenuButtons;
    const next = buttons.map((button) =>
      button.ownerId === ownerId
        ? { ...button, actions: cloneActionGraph(graph) }
        : button,
    );
    useSettingsStore.getState().setSettings({ customMenuButtons: next });
    syncActiveSceneSettings();
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

  for (const entry of listCustomMenuButtonGraphs()) {
    const node = entry.graph.nodes.find((n) => n.id === nodeId);
    if (node && isFieldSourceNode(node)) {
      return {
        ownerId: entry.ownerId,
        node,
        sampleJson: fieldSourceJson(node),
      };
    }
  }

  return null;
}

/** Find any action node by id across hotspot, start, and menu graphs. */
export function findActionNodeOwner(nodeId: string): {
  ownerId: number;
  graph: HotspotActionGraph;
  node: ActionNode;
} | null {
  const editor = useEditorStore.getState();
  for (const hotspot of editor.hotspots) {
    const graph = getActionGraph(hotspot);
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (node) return { ownerId: hotspot.id, graph, node };
  }

  const scenes = useScenesStore.getState();
  const appGraph = scenes.appStartActions ?? createEmptyActionGraph();
  const appNode = appGraph.nodes.find((n) => n.id === nodeId);
  if (appNode) {
    return { ownerId: APP_START_OWNER_ID, graph: appGraph, node: appNode };
  }

  const scene =
    scenes.scenes.find((s) => s.id === scenes.activeSceneId) ?? scenes.scenes[0];
  const sceneGraph = scene?.startActions ?? createEmptyActionGraph();
  const sceneNode = sceneGraph.nodes.find((n) => n.id === nodeId);
  if (sceneNode) {
    return {
      ownerId: SCENE_START_OWNER_ID,
      graph: sceneGraph,
      node: sceneNode,
    };
  }

  for (const entry of listCustomMenuButtonGraphs()) {
    const node = entry.graph.nodes.find((n) => n.id === nodeId);
    if (node) {
      return { ownerId: entry.ownerId, graph: entry.graph, node };
    }
  }

  return null;
}
