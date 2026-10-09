"use client";

import {
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnConnectEnd,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Redo2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  history,
  useCanRedo,
  useCanUndo,
} from "@/lib/editor/history/history-store";
import { recordSnapshotChange } from "@/lib/editor/history/snapshot";
import { toast } from "@/lib/editor/toast";
import {
  attachNodesToFences,
  fenceNodeStyle,
  fencesVisibleOnCanvas,
  isFenceNode,
  mergeFenceSnapshot,
  nodeAbsolutePosition,
  nodeCenter,
  nodesByIdMap,
  pointInFence,
  smallestContainingFence,
  toFenceFlowNode,
  type ActionsCanvasNode,
} from "@/lib/editor/actions/action-fences";
import {
  ACTION_FLOW_NODE_TYPES,
  ACTION_UI_MENU_ITEMS,
} from "@/app/editor/_components/actions/action-node-registry";
import { SpawnHotspotTemplateDrawer } from "@/app/editor/_components/actions/spawn-hotspot-template-drawer";
import {
  shortcutLabel,
  useActionsShortcuts,
} from "@/app/editor/_components/actions/use-actions-shortcuts";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { ActionsCanvasSearch } from "@/app/editor/_components/actions/actions-canvas-search";
import {
  ActionsContextMenu,
  type ActionsContextMenuState,
} from "@/app/editor/_components/actions/actions-context-menu";
import { ActionsEdge, ACTIONS_EDGE_TYPE } from "@/app/editor/_components/actions/actions-edge";
import {
  ActionsEditorProvider,
  type ActionsEditorApi,
  type ActionsPendingConnect,
} from "@/app/editor/_components/actions/actions-editor-context";
import {
  APP_START_OWNER_ID,
  HOTSPOT_GRAPH_ALLOWED_NODE_TYPES,
  MENU_BUTTON_GRAPH_ALLOWED_NODE_TYPES,
  SCENE_START_GRAPH_ALLOWED_NODE_TYPES,
  SCENE_START_OWNER_ID,
  LEGEND_OWNER_ID,
  SPAWN_CLICK_LANE_OWNER_ID,
  START_GRAPH_ALLOWED_NODE_TYPES,
  canConnectActionOwners,
  getOwnedActionGraph,
  isHotspotOwnerId,
  setOwnedActionGraph,
} from "@/lib/editor/actions/action-owners";
import {
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import {
  flowNodeId,
  LANE_HEIGHT,
  parseFlowNodeId,
  toFlowGraph,
  toGraphPosition,
  TRIGGER_FLOW_TYPE,
  type ActionFlowEntry,
  type ActionFlowNodeData,
} from "@/lib/editor/actions/flow-adapter";
import {
  addNode,
  connect,
  insertClonedNode,
  moveNode,
  pastePositionNear,
  removeEdge,
  removeNode,
  updateNodeData,
} from "@/lib/editor/actions/graph-ops";
import { canConnectToForEach } from "@/lib/editor/actions/for-each";
import { filterActionNodeTypesForScene } from "@/lib/editor/actions/registry";
import { listButtonBlocks } from "@/lib/editor/blocks/content-buttons";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  createActionFence,
  useActionFencesStore,
} from "@/lib/editor/state/action-fences-store";
import { useActiveScene, useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import {
  actionFencesScopeKey,
  isActionFenceId,
  type ActionFence,
} from "@/lib/editor/types/action-fence";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";
import type { Hotspot } from "@/lib/editor/types/hotspot";

export type IsolatedActionLane = {
  title: string;
  graph: HotspotActionGraph;
  onChange: (graph: HotspotActionGraph) => void;
  fenceScopeKey: string;
};

type ActionsFlowProps = {
  hotspots: Hotspot[];
  /** Prepend App Start + Scene Start lanes (scene-wide Actions modal). */
  includeStartGraphs?: boolean;
  /** Single-lane editor for a Spawn template click graph. */
  isolatedLane?: IsolatedActionLane;
};

type ActionsFlowCanvasProps = ActionsFlowProps & {
  clipboard: ActionNode | null;
  onClipboardChange: (node: ActionNode | null) => void;
};

const ACTION_EDGE_TYPES = { [ACTIONS_EDGE_TYPE]: ActionsEdge };

const NODE_PLACE_WIDTH = 240;
const NODE_PLACE_Y = 24;
const NODE_PLACE_GAP = 16;

function clientPointFromConnectEvent(event: MouseEvent | TouchEvent): {
  clientX: number;
  clientY: number;
} {
  if ("changedTouches" in event) {
    const touch = event.changedTouches[0];
    if (touch) return { clientX: touch.clientX, clientY: touch.clientY };
  }
  const mouse = event as MouseEvent;
  return { clientX: mouse.clientX, clientY: mouse.clientY };
}

function placeNodeFromHandleDrop(
  drop: ActionNodeXY,
  handleType: ActionsPendingConnect["handleType"],
): ActionNodeXY {
  return {
    x:
      handleType === "target"
        ? drop.x - NODE_PLACE_WIDTH - NODE_PLACE_GAP
        : drop.x + NODE_PLACE_GAP,
    y: drop.y - NODE_PLACE_Y,
  };
}

/** Gap between an anchor node and a node auto-placed after it. */
const NODE_AFTER_GAP = 48;

function laneLabelFor(entry: ActionFlowEntry): string {
  switch (entry.triggerKind) {
    case "appStart":
      return "App Start";
    case "sceneStart":
      return "Scene Start";
    case "legend":
      return "Legend";
    case "menuButton":
      return `Menu · ${entry.title}`;
    case "contentButton":
      return `Button · ${entry.title}`;
    default:
      return entry.title || "Hotspot";
  }
}

function nodeTypeLabel(type: ActionNodeType): string {
  return ACTION_UI_MENU_ITEMS.find((item) => item.type === type)?.meta.label ?? type;
}

/** Node types offered after `sourceType` (For Each only accepts some sources). */
function allowedAfter(
  entry: ActionFlowEntry,
  sourceType: ActionNodeType | undefined,
): ActionNodeType[] {
  return canConnectToForEach(sourceType)
    ? entry.allowedNodeTypes
    : entry.allowedNodeTypes.filter((type) => type !== "forEach");
}

/** Nodes with a single default output that a "next" node can be wired to. */
function hasDefaultOutput(node: ActionNode): boolean {
  if (node.type === "switch" || node.type === "openModal") return false;
  if (node.type === "sendPostMessage" && node.data.mode === "receive") {
    return false;
  }
  return true;
}

function triggerHasDefaultOutput(entry: ActionFlowEntry): boolean {
  if (entry.triggerKind === "legend") return false;
  if (entry.triggerKind === "menuButton" && entry.toggleEnabled) return false;
  return true;
}

type CanvasSnapshot = {
  graphs: Array<[number, HotspotActionGraph]>;
  fences: ActionFence[];
};

type AutoConnect = {
  pendingConnect: ActionsPendingConnect;
  anchorLabel: string;
  anchorType?: ActionNodeType;
  /** Graph position just right of the anchor. */
  position: ActionNodeXY;
};

function graphFingerprint(graph: HotspotActionGraph): string {
  const nodes = graph.nodes.map((n) => `${n.id}:${n.type}`).join(",");
  const edges = graph.edges
    .map((e) => `${e.source}:${e.sourceHandle ?? ""}>${e.target}`)
    .join(",");
  return `${nodes}|${edges}`;
}

/**
 * Lane identity for remounting the React Flow provider.
 * Graph node add/remove must NOT remount — that resets the camera.
 */
function canvasSessionKeyFor(
  sceneId: string,
  hotspots: Hotspot[],
  includeStartGraphs: boolean,
  menuButtonOwnerIds: number[],
  legendEnabled: boolean,
  isolatedKey?: string,
): string {
  if (isolatedKey) return isolatedKey;
  const owners = includeStartGraphs
    ? [
        "app",
        "scene",
        ...(legendEnabled ? ["legend"] : []),
        ...menuButtonOwnerIds.map((id) => `m${id}`),
      ]
    : [];
  for (const hotspot of hotspots) owners.push(`h${hotspot.id}`);
  for (const { block } of listButtonBlocks(hotspots)) {
    owners.push(`b${block.ownerId}`);
  }
  return `${sceneId}:${owners.join(",")}`;
}

function graphStructureKeyFor(entries: ActionFlowEntry[]): string {
  return entries
    .map((entry) => `${entry.ownerId}[${graphFingerprint(entry.graph)}]`)
    .join("||");
}

function ActionsFlowCanvas({
  hotspots,
  includeStartGraphs = false,
  isolatedLane,
  clipboard,
  onClipboardChange,
}: ActionsFlowCanvasProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const liveHotspots = useEditorStore((s) => s.hotspots);
  const activeScene = useActiveScene();
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const legendCategories = useSettingsStore((s) => s.legendCategories);
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const flowRootRef = useRef<HTMLDivElement>(null);
  const [rawMenu, setRawMenu] = useState<ActionsContextMenuState | null>(null);
  const skipNextPaneClickRef = useRef(false);
  const isolatedLaneRef = useRef(isolatedLane);
  isolatedLaneRef.current = isolatedLane;
  const scopeKey = isolatedLane
    ? isolatedLane.fenceScopeKey
    : actionFencesScopeKey(activeScene.id);
  const storeFences = useActionFencesStore((s) => s.byScope[scopeKey]);
  const fences = isolatedLane
    ? (storeFences ?? [])
    : (storeFences ?? activeScene.actionFences ?? []);
  const pendingCreate = useActionFencesStore((s) => s.pendingCreate);
  const consumeCreateFence = useActionFencesStore((s) => s.consumeCreateFence);
  const addFence = useActionFencesStore((s) => s.addFence);
  const updateFence = useActionFencesStore((s) => s.updateFence);
  const removeFence = useActionFencesStore((s) => s.removeFence);
  const applyMemberships = useActionFencesStore((s) => s.applyMemberships);
  const hydrateScope = useActionFencesStore((s) => s.hydrateScope);
  const setFences = useActionFencesStore((s) => s.setFences);

  useLayoutEffect(() => {
    if (isolatedLane) {
      const existing = useActionFencesStore.getState().byScope[scopeKey];
      if (existing === undefined) hydrateScope(scopeKey, []);
      return;
    }
    const leftover = useActionFencesStore.getState().takeHotspotFences();
    const existing = useActionFencesStore.getState().byScope[scopeKey];
    const base = existing ?? activeScene.actionFences ?? [];
    if (leftover.length > 0) {
      const seen = new Set(base.map((fence) => fence.id));
      setFences(scopeKey, [
        ...base,
        ...leftover.filter((fence) => !seen.has(fence.id)),
      ]);
      return;
    }
    if (existing === undefined) {
      hydrateScope(scopeKey, activeScene.actionFences ?? []);
    }
  }, [activeScene.actionFences, hydrateScope, isolatedLane, scopeKey, setFences]);

  const menuPositionFromEvent = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = flowRootRef.current?.getBoundingClientRect();
      if (!rect) return { x: event.clientX, y: event.clientY };
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    [],
  );

  const entries: ActionFlowEntry[] = useMemo(() => {
    const forScene = (types: ActionNodeType[]) =>
      filterActionNodeTypesForScene(types, activeScene.type);

    if (isolatedLane) {
      return [
        {
          ownerId: SPAWN_CLICK_LANE_OWNER_ID,
          title: isolatedLane.title,
          graph: isolatedLane.graph,
          laneIndex: 0,
          triggerKind: "hotspot" as const,
          allowedNodeTypes: forScene(HOTSPOT_GRAPH_ALLOWED_NODE_TYPES),
        },
      ];
    }

    const list: ActionFlowEntry[] = [];
    let laneIndex = 0;

    if (includeStartGraphs) {
      list.push({
        ownerId: APP_START_OWNER_ID,
        title: "All scenes",
        graph: appStartActions ?? createEmptyActionGraph(),
        laneIndex: laneIndex++,
        triggerKind: "appStart",
        allowedNodeTypes: forScene(START_GRAPH_ALLOWED_NODE_TYPES),
      });
      list.push({
        ownerId: SCENE_START_OWNER_ID,
        title: activeScene.name,
        graph: activeScene.startActions ?? createEmptyActionGraph(),
        laneIndex: laneIndex++,
        triggerKind: "sceneStart",
        allowedNodeTypes: forScene(SCENE_START_GRAPH_ALLOWED_NODE_TYPES),
      });
      if (legendEnabled) {
        list.push({
          ownerId: LEGEND_OWNER_ID,
          title: "Legend",
          graph:
            getOwnedActionGraph(LEGEND_OWNER_ID) ?? createEmptyActionGraph(),
          laneIndex: laneIndex++,
          triggerKind: "legend",
          allowedNodeTypes: forScene(SCENE_START_GRAPH_ALLOWED_NODE_TYPES),
        });
      }
      for (const button of customMenuButtons) {
        list.push({
          ownerId: button.ownerId,
          title: button.tooltip.trim() || "Custom button",
          graph: button.actions ?? createEmptyActionGraph(),
          laneIndex: laneIndex++,
          triggerKind: "menuButton",
          triggerIcon: button.icon,
          toggledIcon: button.toggledIcon,
          toggleEnabled: button.toggleEnabled,
          allowedNodeTypes: forScene(MENU_BUTTON_GRAPH_ALLOWED_NODE_TYPES),
        });
      }
      for (const hotspot of hotspots) {
        list.push({
          ownerId: hotspot.id,
          title: hotspot.title,
          graph: getActionGraph(hotspot),
          laneIndex: laneIndex++,
          triggerKind: "hotspot",
          allowedNodeTypes: forScene(HOTSPOT_GRAPH_ALLOWED_NODE_TYPES),
        });
      }
      for (const { hotspot, block } of listButtonBlocks(hotspots)) {
        list.push({
          ownerId: block.ownerId,
          title: block.label.trim() || "Action button",
          graph: block.actions ?? createEmptyActionGraph(),
          laneIndex: laneIndex++,
          triggerKind: "contentButton",
          triggerIcon: block.icon,
          triggerSubtitle: hotspot.title,
          allowedNodeTypes: forScene(MENU_BUTTON_GRAPH_ALLOWED_NODE_TYPES),
        });
      }
      return list;
    }

    // Hotspot-only canvas uses the same lane Y as Scene Actions so fences
    // (stored in scene flow coords) line up with these nodes.
    const sceneLaneBase =
      2 + (legendEnabled ? 1 : 0) + customMenuButtons.length;
    const sceneHotspots = activeScene.hotspots;
    for (const hotspot of hotspots) {
      const sceneIndex = sceneHotspots.findIndex((item) => item.id === hotspot.id);
      list.push({
        ownerId: hotspot.id,
        title: hotspot.title,
        graph: getActionGraph(hotspot),
        laneIndex: sceneLaneBase + (sceneIndex >= 0 ? sceneIndex : 0),
        triggerKind: "hotspot",
        allowedNodeTypes: forScene(HOTSPOT_GRAPH_ALLOWED_NODE_TYPES),
      });
    }

    const shownHotspotIds = new Set(hotspots.map((hotspot) => hotspot.id));
    listButtonBlocks(liveHotspots).forEach(({ hotspot, block }, globalIndex) => {
      if (!shownHotspotIds.has(hotspot.id)) return;
      list.push({
        ownerId: block.ownerId,
        title: block.label.trim() || "Action button",
        graph: block.actions ?? createEmptyActionGraph(),
        laneIndex: sceneLaneBase + liveHotspots.length + globalIndex,
        triggerKind: "contentButton",
        triggerIcon: block.icon,
        triggerSubtitle: hotspot.title,
        allowedNodeTypes: forScene(MENU_BUTTON_GRAPH_ALLOWED_NODE_TYPES),
      });
    });

    return list;
  }, [
    activeScene.hotspots,
    activeScene.name,
    activeScene.startActions,
    activeScene.legendActions,
    activeScene.type,
    appStartActions,
    customMenuButtons,
    hotspots,
    includeStartGraphs,
    isolatedLane,
    legendCategories,
    legendEnabled,
    liveHotspots,
  ]);

  const laneByOwnerId = useMemo(() => {
    const map = new Map<number, number>();
    entries.forEach((entry) => map.set(entry.ownerId, entry.laneIndex));
    return map;
  }, [entries]);

  const allowedByOwnerId = useMemo(() => {
    const map = new Map<number, ActionNodeType[]>();
    entries.forEach((entry) =>
      map.set(entry.ownerId, entry.allowedNodeTypes),
    );
    return map;
  }, [entries]);

  const ownerIds = useMemo(
    () => new Set(entries.map((e) => e.ownerId)),
    [entries],
  );

  const menu =
    rawMenu && ownerIds.has(rawMenu.hotspotId) ? rawMenu : null;

  const { nodes: initialNodes, edges: storeEdges } = useMemo(
    () => toFlowGraph(entries),
    [entries],
  );
  const canvasFences = useMemo(() => {
    const visibleIds = new Set(initialNodes.map((node) => node.id));
    if (includeStartGraphs) {
      return fencesVisibleOnCanvas(fences, visibleIds, { includeAll: true });
    }
    const laneIndex = entries[0]?.laneIndex ?? 0;
    return fencesVisibleOnCanvas(fences, visibleIds, {
      includeAll: false,
      laneIndex,
      laneHeight: LANE_HEIGHT,
    });
  }, [entries, fences, includeStartGraphs, initialNodes]);
  const [nodes, setNodes] = useState<ActionsCanvasNode[]>(() =>
    attachNodesToFences(initialNodes, canvasFences, scopeKey),
  );
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const graphStructureKey = useMemo(
    () => graphStructureKeyFor(entries),
    [entries],
  );
  const lastGraphStructureKey = useRef(graphStructureKey);

  useEffect(() => {
    if (lastGraphStructureKey.current === graphStructureKey) return;
    lastGraphStructureKey.current = graphStructureKey;
    setNodes((current) => {
      const rebuilt = attachNodesToFences(
        initialNodes,
        canvasFences,
        scopeKey,
      );
      const prevById = nodesByIdMap(current);
      return rebuilt.map((node) => {
        const prev = prevById.get(node.id);
        if (!prev) return node;
        if (isFenceNode(node)) {
          return {
            ...node,
            selected: prev.selected,
            position: prev.position,
            measured: prev.measured,
          };
        }
        return {
          ...node,
          selected: prev.selected,
          measured: prev.measured,
          width: prev.width,
          height: prev.height,
          position:
            prev.parentId === node.parentId ? prev.position : node.position,
        };
      });
    });
  }, [canvasFences, graphStructureKey, initialNodes, scopeKey]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        if (isFenceNode(node)) return node;
        const data = node.data as ActionFlowNodeData;
        if (!data.isTrigger) return node;
        const entry = entries.find((item) => item.ownerId === data.hotspotId);
        if (!entry) return node;
        if (
          data.hotspotTitle === entry.title &&
          data.triggerIcon === entry.triggerIcon &&
          data.toggledIcon === entry.toggledIcon &&
          data.toggleEnabled === entry.toggleEnabled &&
          data.triggerSubtitle === entry.triggerSubtitle
        ) {
          return node;
        }
        return {
          ...node,
          data: {
            ...data,
            hotspotTitle: entry.title,
            triggerIcon: entry.triggerIcon,
            toggledIcon: entry.toggledIcon,
            toggleEnabled: entry.toggleEnabled,
            triggerSubtitle: entry.triggerSubtitle,
          },
        };
      }),
    );
  }, [entries]);

  const edges = useMemo(
    () =>
      storeEdges.map((edge) => ({
        ...edge,
        selected: selectedEdgeIds.has(edge.id),
      })),
    [selectedEdgeIds, storeEdges],
  );

  const writeGraph = useCallback(
    (ownerId: number, graph: HotspotActionGraph) => {
      const isolated = isolatedLaneRef.current;
      if (isolated && ownerId === SPAWN_CLICK_LANE_OWNER_ID) {
        isolated.onChange(graph);
        return;
      }
      if (isHotspotOwnerId(ownerId)) {
        updateHotspot(ownerId, { actions: graph });
        return;
      }
      setOwnedActionGraph(ownerId, graph);
    },
    [updateHotspot],
  );

  const readGraph = useCallback((ownerId: number): HotspotActionGraph | null => {
    const isolated = isolatedLaneRef.current;
    if (isolated && ownerId === SPAWN_CLICK_LANE_OWNER_ID) {
      return isolated.graph;
    }
    return getOwnedActionGraph(ownerId);
  }, []);

  const updateGraph = useCallback(
    (
      ownerId: number,
      updater: (graph: HotspotActionGraph) => HotspotActionGraph,
    ) => {
      const current = readGraph(ownerId);
      if (!current) return;
      writeGraph(ownerId, updater(current));
    },
    [readGraph, writeGraph],
  );

  //#region: Undo / redo
  // Graph edits are recorded as before/after snapshots of the touched owners'
  // graphs plus this canvas's fences. Scope = the fence scope key.
  const captureCanvas = useCallback(
    (ownerIds: number[]): CanvasSnapshot => ({
      graphs: [...new Set(ownerIds)].flatMap((ownerId) => {
        const graph = getOwnedActionGraph(ownerId);
        return graph
          ? [[ownerId, structuredClone(graph)] as [number, HotspotActionGraph]]
          : [];
      }),
      fences: structuredClone(useActionFencesStore.getState().getFences(scopeKey)),
    }),
    [scopeKey],
  );

  const restoreCanvas = useCallback(
    (target: CanvasSnapshot, other: CanvasSnapshot) => {
      const fenceStore = useActionFencesStore.getState();
      fenceStore.setFences(
        scopeKey,
        mergeFenceSnapshot(
          fenceStore.getFences(scopeKey),
          target.fences,
          other.fences,
        ),
      );
      for (const [ownerId, graph] of target.graphs) {
        writeGraph(ownerId, structuredClone(graph));
      }
    },
    [scopeKey, writeGraph],
  );

  const recordCanvasChange = useCallback(
    (label: string, before: CanvasSnapshot, undoToast?: string) => {
      recordSnapshotChange({
        scope: scopeKey,
        label,
        before,
        after: captureCanvas(before.graphs.map(([ownerId]) => ownerId)),
        restore: restoreCanvas,
        toast: undoToast,
      });
    },
    [captureCanvas, restoreCanvas, scopeKey],
  );

  const runCanvasChange = useCallback(
    (
      label: string,
      ownerIds: number[],
      apply: () => void,
      undoToast?: string,
    ) => {
      const before = captureCanvas(ownerIds);
      apply();
      recordCanvasChange(label, before, undoToast);
    },
    [captureCanvas, recordCanvasChange],
  );

  // Spawn-click lane history writes through this instance's props; drop it on close.
  const isolatedScope = isolatedLane?.fenceScopeKey;
  useEffect(() => {
    if (!isolatedScope) return;
    return () => history.clear(isolatedScope);
  }, [isolatedScope]);
  //#endregion

  /** Lane whose trigger row is closest to a flow-space point. */
  const pickLaneEntry = useCallback(
    (flowPos: { x: number; y: number }): ActionFlowEntry => {
      let best = entries[0]!;
      let bestDist = Infinity;
      for (const entry of entries) {
        const localY = toGraphPosition(flowPos.x, flowPos.y, entry.laneIndex).y;
        const dist = Math.abs(localY - 120);
        if (dist < bestDist) {
          bestDist = dist;
          best = entry;
        }
      }
      return best;
    },
    [entries],
  );

  /**
   * Where a new node should be wired: the selected node in this lane, else the
   * lane's last open-ended node, else the trigger. Never replaces an existing edge.
   */
  const resolveAutoConnect = useCallback(
    (entry: ActionFlowEntry): AutoConnect | null => {
      const { graph, ownerId } = entry;
      const hasOutgoing = new Set(graph.edges.map((edge) => edge.source));
      const widthOf = (nodeId: string, fallback: number) =>
        nodesRef.current.find((node) => node.id === flowNodeId(ownerId, nodeId))
          ?.measured?.width ?? fallback;

      const afterNode = (node: ActionNode): AutoConnect => ({
        pendingConnect: { nodeId: node.id, handleId: null, handleType: "source" },
        anchorType: node.type,
        anchorLabel: nodeTypeLabel(node.type),
        position: {
          x: node.position.x + widthOf(node.id, NODE_PLACE_WIDTH) + NODE_AFTER_GAP,
          y: node.position.y,
        },
      });
      const afterTrigger = (): AutoConnect => ({
        pendingConnect: {
          nodeId: TRIGGER_NODE_ID,
          handleId: null,
          handleType: "source",
        },
        anchorLabel: "trigger",
        position: {
          x: graph.trigger.position.x + widthOf(TRIGGER_NODE_ID, 220) + NODE_AFTER_GAP,
          y: graph.trigger.position.y,
        },
      });
      const triggerOpen =
        triggerHasDefaultOutput(entry) && !hasOutgoing.has(TRIGGER_NODE_ID);

      const selected = nodesRef.current.find(
        (node) =>
          node.selected &&
          !isFenceNode(node) &&
          parseFlowNodeId(node.id)?.hotspotId === ownerId,
      );
      const selectedId = selected ? parseFlowNodeId(selected.id)?.nodeId : null;
      if (selectedId === TRIGGER_NODE_ID && triggerOpen) return afterTrigger();
      if (selectedId && selectedId !== TRIGGER_NODE_ID) {
        const node = graph.nodes.find((item) => item.id === selectedId);
        if (node && hasDefaultOutput(node) && !hasOutgoing.has(node.id)) {
          return afterNode(node);
        }
      }

      const reachable = new Set<string>();
      const queue = [TRIGGER_NODE_ID];
      while (queue.length > 0) {
        const id = queue.pop()!;
        for (const edge of graph.edges) {
          if (edge.source !== id || reachable.has(edge.target)) continue;
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      }
      let tail: ActionNode | null = null;
      for (const node of graph.nodes) {
        if (!reachable.has(node.id)) continue;
        if (!hasDefaultOutput(node) || hasOutgoing.has(node.id)) continue;
        if (!tail || node.position.x > tail.position.x) tail = node;
      }
      if (tail) return afterNode(tail);
      return triggerOpen ? afterTrigger() : null;
    },
    [],
  );

  const openPaneMenu = useCallback(
    (
      client: { clientX: number; clientY: number },
      options?: {
        entry?: ActionFlowEntry;
        /** Drop the node beside its anchor instead of at the pointer. */
        placeAtAnchor?: boolean;
        /** Menu position in canvas px; defaults to the pointer. */
        menuPoint?: { x: number; y: number };
      },
    ) => {
      if (entries.length === 0) return;
      const flowPos = screenToFlowPosition({
        x: client.clientX,
        y: client.clientY,
      });
      const entry = options?.entry ?? pickLaneEntry(flowPos);
      const pointerPos = toGraphPosition(flowPos.x, flowPos.y, entry.laneIndex);
      const auto = resolveAutoConnect(entry);
      const menuPos = options?.menuPoint ?? menuPositionFromEvent(client);
      setRawMenu({
        kind: "pane",
        x: menuPos.x,
        y: menuPos.y,
        hotspotId: entry.ownerId,
        flowPosition: auto && options?.placeAtAnchor ? auto.position : pointerPos,
        allowedNodeTypes: auto
          ? allowedAfter(entry, auto.anchorType)
          : entry.allowedNodeTypes,
        pendingConnect: auto?.pendingConnect,
        autoConnect: Boolean(auto),
        anchorLabel: auto?.anchorLabel,
        laneLabel: entries.length > 1 ? laneLabelFor(entry) : undefined,
      });
    },
    [
      entries,
      menuPositionFromEvent,
      pickLaneEntry,
      resolveAutoConnect,
      screenToFlowPosition,
    ],
  );

  const openAddMenu = useCallback(
    (
      ownerId: number,
      client: { clientX: number; clientY: number },
      pendingConnect: ActionsPendingConnect,
    ) => {
      const entry = entries.find((item) => item.ownerId === ownerId);
      if (!entry) return;
      const fromFlow = nodesRef.current.find(
        (node) => node.id === flowNodeId(ownerId, pendingConnect.nodeId),
      );
      const sourceType =
        fromFlow && fromFlow.type !== TRIGGER_FLOW_TYPE
          ? (fromFlow.type as ActionNodeType)
          : undefined;
      const allowed = allowedAfter(entry, sourceType);
      if (allowed.length === 0) return;
      const flowPos = screenToFlowPosition({
        x: client.clientX,
        y: client.clientY,
      });
      const menuPos = menuPositionFromEvent(client);
      setRawMenu({
        kind: "pane",
        x: menuPos.x,
        y: menuPos.y,
        hotspotId: ownerId,
        flowPosition: placeNodeFromHandleDrop(
          toGraphPosition(flowPos.x, flowPos.y, entry.laneIndex),
          "source",
        ),
        allowedNodeTypes: allowed,
        pendingConnect,
        laneLabel: entries.length > 1 ? laneLabelFor(entry) : undefined,
      });
    },
    [entries, menuPositionFromEvent, screenToFlowPosition],
  );

  const onAddButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const root = flowRootRef.current?.getBoundingClientRect();
      if (!root) return;
      const button = event.currentTarget.getBoundingClientRect();
      // Prefer the lane of the selected node; otherwise the lane in view.
      const selected = nodesRef.current.find(
        (node) => node.selected && !isFenceNode(node),
      );
      const selectedOwner = selected
        ? parseFlowNodeId(selected.id)?.hotspotId
        : undefined;
      openPaneMenu(
        {
          clientX: root.left + root.width / 2,
          clientY: root.top + root.height / 2,
        },
        {
          entry: entries.find((item) => item.ownerId === selectedOwner),
          placeAtAnchor: true,
          menuPoint: {
            x: button.left - root.left,
            y: button.bottom - root.top + 6,
          },
        },
      );
    },
    [entries, openPaneMenu],
  );

  const api: ActionsEditorApi = useMemo(
    () => ({
      updateGraph,
      openAddMenu,
      deleteNode: (ownerId, nodeId) => {
        runCanvasChange(
          "Delete action",
          [ownerId],
          () => updateGraph(ownerId, (graph) => removeNode(graph, nodeId)),
          "Action deleted",
        );
      },
      deleteEdge: (ownerId, edgeId) => {
        runCanvasChange(
          "Delete connection",
          [ownerId],
          () => updateGraph(ownerId, (graph) => removeEdge(graph, edgeId)),
          "Connection deleted",
        );
      },
      deleteFence: (fenceId) => {
        runCanvasChange(
          "Delete fence",
          [],
          () => removeFence(scopeKey, fenceId),
          "Fence deleted",
        );
      },
      updateNodeData: (ownerId, nodeId, patch) => {
        updateGraph(ownerId, (graph) => updateNodeData(graph, nodeId, patch));
      },
      addNode: (ownerId, type, position, pendingConnect) => {
        const allowed =
          allowedByOwnerId.get(ownerId) ?? HOTSPOT_GRAPH_ALLOWED_NODE_TYPES;
        if (!allowed.includes(type)) return;
        runCanvasChange("Add action", [ownerId], () =>
          updateGraph(ownerId, (graph) => {
            const { graph: withNode, node } = addNode(graph, type, position);
            if (!pendingConnect) return withNode;
            if (pendingConnect.handleType === "source") {
              return connect(
                withNode,
                pendingConnect.nodeId,
                node.id,
                pendingConnect.handleId,
              );
            }
            if (pendingConnect.nodeId === TRIGGER_NODE_ID) return withNode;
            return connect(withNode, node.id, pendingConnect.nodeId, null);
          }),
        );
      },
      clipboard,
      copyNode: (ownerId, nodeId) => {
        const graph = readGraph(ownerId);
        const node = graph?.nodes.find((item) => item.id === nodeId);
        if (!node) return;
        onClipboardChange(structuredClone(node));
      },
      pasteNode: (ownerId, target) => {
        if (!clipboard) return false;
        const allowed =
          allowedByOwnerId.get(ownerId) ?? HOTSPOT_GRAPH_ALLOWED_NODE_TYPES;
        if (!allowed.includes(clipboard.type)) {
          toast.error("That node type isn’t allowed in this lane");
          return false;
        }
        const graph = readGraph(ownerId);
        if (!graph) return false;
        const position =
          target?.position ?? pastePositionNear(graph, target?.nearNodeId);
        runCanvasChange("Paste action", [ownerId], () =>
          writeGraph(ownerId, insertClonedNode(graph, clipboard, position)),
        );
        return true;
      },
    }),
    [
      allowedByOwnerId,
      clipboard,
      onClipboardChange,
      openAddMenu,
      readGraph,
      removeFence,
      runCanvasChange,
      scopeKey,
      updateGraph,
      writeGraph,
    ],
  );

  //#region: Undo / redo controls and shortcuts
  const canUndo = useCanUndo(scopeKey);
  const canRedo = useCanRedo(scopeKey);

  const undo = useCallback(() => {
    const entry = history.undo(scopeKey);
    if (entry) toast.message(`Undid: ${entry.label}`, { duration: 1600 });
  }, [scopeKey]);

  const redo = useCallback(() => {
    const entry = history.redo(scopeKey);
    if (entry) toast.message(`Redid: ${entry.label}`, { duration: 1600 });
  }, [scopeKey]);

  /** Selected action nodes (no triggers / fences), grouped by lane owner. */
  const selectedActions = useCallback(() => {
    const picked: Array<{ ownerId: number; nodeId: string }> = [];
    for (const node of nodesRef.current) {
      if (!node.selected || isFenceNode(node)) continue;
      const parsed = parseFlowNodeId(node.id);
      if (!parsed || parsed.nodeId === TRIGGER_NODE_ID) continue;
      picked.push({ ownerId: parsed.hotspotId, nodeId: parsed.nodeId });
    }
    return picked;
  }, []);

  const copySelected = useCallback((): boolean => {
    const [first] = selectedActions();
    if (!first) return false;
    api.copyNode(first.ownerId, first.nodeId);
    toast.message("Action copied", { duration: 1400 });
    return true;
  }, [api, selectedActions]);

  const pasteClipboard = useCallback((): boolean => {
    if (!api.clipboard) return false;
    const selected = nodesRef.current.find(
      (node) => node.selected && !isFenceNode(node),
    );
    const parsed = selected ? parseFlowNodeId(selected.id) : null;
    if (parsed) {
      return api.pasteNode(parsed.hotspotId, { nearNodeId: parsed.nodeId });
    }
    // Nothing selected: drop it in the lane at the centre of the view.
    const root = flowRootRef.current?.getBoundingClientRect();
    if (!root || entries.length === 0) return false;
    const flowPos = screenToFlowPosition({
      x: root.left + root.width / 2,
      y: root.top + root.height / 2,
    });
    const entry = pickLaneEntry(flowPos);
    return api.pasteNode(entry.ownerId, {
      position: toGraphPosition(flowPos.x, flowPos.y, entry.laneIndex),
    });
  }, [api, entries.length, pickLaneEntry, screenToFlowPosition]);

  const duplicateSelected = useCallback((): boolean => {
    const selected = selectedActions();
    if (selected.length === 0) return false;
    const ownerIds = [...new Set(selected.map((item) => item.ownerId))];
    runCanvasChange("Duplicate", ownerIds, () => {
      for (const ownerId of ownerIds) {
        let graph = getOwnedActionGraph(ownerId);
        if (!graph) continue;
        for (const item of selected) {
          if (item.ownerId !== ownerId) continue;
          const source = graph.nodes.find((node) => node.id === item.nodeId);
          if (!source) continue;
          graph = insertClonedNode(
            graph,
            source,
            pastePositionNear(graph, source.id),
          );
        }
        writeGraph(ownerId, graph);
      }
    });
    return true;
  }, [runCanvasChange, selectedActions, writeGraph]);

  useActionsShortcuts({
    undo,
    redo,
    copy: copySelected,
    paste: pasteClipboard,
    duplicate: duplicateSelected,
  });
  //#endregion

  const persistActionPosition = useCallback(
    (node: ActionsCanvasNode, byId: Map<string, Node>) => {
      if (isFenceNode(node)) return;
      const parsed = parseFlowNodeId(node.id);
      if (!parsed) return;
      const abs = nodeAbsolutePosition(node, byId);
      const laneIndex = laneByOwnerId.get(parsed.hotspotId) ?? 0;
      updateGraph(parsed.hotspotId, (graph) =>
        moveNode(graph, parsed.nodeId, toGraphPosition(abs.x, abs.y, laneIndex)),
      );
    },
    [laneByOwnerId, updateGraph],
  );

  const onNodesChange: OnNodesChange<ActionsCanvasNode> = useCallback(
    (changes: NodeChange<ActionsCanvasNode>[]) => {
      const removingFenceIds = new Set<string>();
      for (const change of changes) {
        if (change.type === "remove" && isActionFenceId(change.id)) {
          removingFenceIds.add(change.id);
        }
      }

      const safeChanges =
        removingFenceIds.size === 0
          ? changes
          : changes.filter((change) => {
              if (change.type !== "remove") return true;
              if (removingFenceIds.has(change.id)) return true;
              const current = nodesRef.current.find((node) => node.id === change.id);
              return !(current?.parentId && removingFenceIds.has(current.parentId));
            });

      let next = nodesRef.current;
      setNodes((current) => {
        let mapped = applyNodeChanges(safeChanges, current);
        if (removingFenceIds.size > 0) {
          const before = nodesByIdMap(current);
          mapped = mapped.map((node) => {
            if (!node.parentId || !removingFenceIds.has(node.parentId)) {
              return node;
            }
            return {
              ...node,
              parentId: undefined,
              position: nodeAbsolutePosition(node, before),
            };
          });
        }
        next = mapped;
        nodesRef.current = mapped;
        return mapped;
      });

      const byId = nodesByIdMap(next);

      for (const id of removingFenceIds) {
        removeFence(scopeKey, id);
      }

      for (const change of safeChanges) {
        if (change.type === "remove") {
          if (isActionFenceId(change.id)) continue;
          const parsed = parseFlowNodeId(change.id);
          if (!parsed || parsed.nodeId === TRIGGER_NODE_ID) continue;
          updateGraph(parsed.hotspotId, (graph) =>
            removeNode(graph, parsed.nodeId),
          );
          applyMemberships(scopeKey, [{ nodeId: change.id, fenceId: null }]);
          continue;
        }
        if (
          change.type === "dimensions" &&
          isActionFenceId(change.id) &&
          change.dimensions
        ) {
          updateFence(scopeKey, change.id, {
            width: change.dimensions.width,
            height: change.dimensions.height,
          });
          if (change.resizing === false) {
            const fenceNode = next.find((item) => item.id === change.id);
            if (fenceNode) {
              const map = nodesByIdMap(next);
              const memberships: Array<{ nodeId: string; fenceId: string | null }> =
                [];
              const ungrouped = new Map<string, { x: number; y: number }>();
              for (const child of next) {
                if (child.parentId !== fenceNode.id) continue;
                if (pointInFence(nodeCenter(child, map), fenceNode)) continue;
                ungrouped.set(child.id, nodeAbsolutePosition(child, map));
                memberships.push({ nodeId: child.id, fenceId: null });
              }
              if (ungrouped.size > 0) {
                setNodes((current) =>
                  current.map((item) => {
                    const abs = ungrouped.get(item.id);
                    if (!abs) return item;
                    return { ...item, parentId: undefined, position: abs };
                  }),
                );
                applyMemberships(scopeKey, memberships);
              }
            }
          }
          continue;
        }
        if (
          change.type === "position" &&
          change.position &&
          change.dragging === false
        ) {
          const node = next.find((item) => item.id === change.id);
          if (!node) continue;
          if (isFenceNode(node)) {
            updateFence(scopeKey, node.id, {
              x: node.position.x,
              y: node.position.y,
            });
            for (const child of next) {
              if (child.parentId === node.id) persistActionPosition(child, byId);
            }
            continue;
          }
          persistActionPosition(node, byId);
        }
      }
    },
    [
      applyMemberships,
      persistActionPosition,
      removeFence,
      scopeKey,
      updateFence,
      updateGraph,
    ],
  );

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setSelectedEdgeIds((current) => {
      let next: Set<string> | null = null;
      for (const change of changes) {
        if (change.type !== "select") continue;
        if (!next) next = new Set(current);
        if (change.selected) next.add(change.id);
        else next.delete(change.id);
      }
      return next ?? current;
    });
  }, []);

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const edge of deleted) {
        const parsed = parseFlowNodeId(edge.id);
        if (!parsed) continue;
        updateGraph(parsed.hotspotId, (graph) =>
          removeEdge(graph, parsed.nodeId),
        );
      }
    },
    [updateGraph],
  );

  // Deleting is immediate: snapshot before, record once ReactFlow finishes.
  const pendingDeleteRef = useRef<{
    before: CanvasSnapshot;
    message: string;
  } | null>(null);

  const onBeforeDelete = useCallback(
    async ({
      nodes: nodesToDelete,
      edges: edgesToDelete,
    }: {
      nodes: ActionsCanvasNode[];
      edges: Edge[];
    }) => {
      const fenceIds = new Set(
        nodesToDelete
          .filter((node) => isActionFenceId(node.id))
          .map((node) => node.id),
      );
      const actions = nodesToDelete.filter((node) => {
        if (isActionFenceId(node.id)) return false;
        if (node.parentId && fenceIds.has(node.parentId)) return false;
        const parsed = parseFlowNodeId(node.id);
        return Boolean(parsed && parsed.nodeId !== TRIGGER_NODE_ID);
      });
      const nodeIds = new Set(nodesToDelete.map((node) => node.id));
      const extraEdges = edgesToDelete.filter(
        (edge) => !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
      );
      const fenceCount = fenceIds.size;
      const actionCount = actions.length;
      const edgeCount = extraEdges.length;
      const total = fenceCount + actionCount + edgeCount;
      if (total === 0) return false;

      const ownerIds = [...nodesToDelete, ...edgesToDelete].flatMap((item) => {
        const parsed = parseFlowNodeId(item.id);
        return parsed ? [parsed.hotspotId] : [];
      });
      const noun =
        actionCount === total
          ? "Action"
          : fenceCount === total
            ? "Fence"
            : edgeCount === total
              ? "Connection"
              : null;
      pendingDeleteRef.current = {
        before: captureCanvas(ownerIds),
        message:
          total === 1 && noun
            ? `${noun} deleted`
            : `${total} ${noun ? `${noun.toLowerCase()}s` : "items"} deleted`,
      };
      return true;
    },
    [captureCanvas],
  );

  const onDelete = useCallback(() => {
    const pending = pendingDeleteRef.current;
    pendingDeleteRef.current = null;
    if (!pending) return;
    recordCanvasChange("Delete", pending.before, pending.message);
  }, [recordCanvasChange]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceParsed = parseFlowNodeId(connection.source);
      const targetParsed = parseFlowNodeId(connection.target);
      if (!sourceParsed || !targetParsed) return;
      if (sourceParsed.nodeId === targetParsed.nodeId) return;
      if (targetParsed.nodeId === TRIGGER_NODE_ID) return;
      if (
        !canConnectActionOwners(
          sourceParsed.hotspotId,
          targetParsed.hotspotId,
        )
      ) {
        return;
      }

      // Same lane — normal connect.
      if (sourceParsed.hotspotId === targetParsed.hotspotId) {
        runCanvasChange("Connect", [sourceParsed.hotspotId], () =>
          updateGraph(sourceParsed.hotspotId, (graph) =>
            connect(
              graph,
              sourceParsed.nodeId,
              targetParsed.nodeId,
              connection.sourceHandle,
            ),
          ),
        );
        return;
      }

      // App Start / Scene Start / menu button: move the target into that graph.
      const fromOwner = targetParsed.hotspotId;
      const toOwner = sourceParsed.hotspotId;
      const allowed = allowedByOwnerId.get(toOwner);
      const fromGraph = getOwnedActionGraph(fromOwner);
      const toGraph = getOwnedActionGraph(toOwner);
      if (!fromGraph || !toGraph) return;

      const moving = fromGraph.nodes.find((n) => n.id === targetParsed.nodeId);
      if (!moving || !allowed?.includes(moving.type)) return;

      const fromLane = laneByOwnerId.get(fromOwner) ?? 0;
      const toLane = laneByOwnerId.get(toOwner) ?? 0;
      const flowY = moving.position.y + fromLane * LANE_HEIGHT;
      const nextPosition = toGraphPosition(
        moving.position.x,
        flowY,
        toLane,
      );

      const nextFrom = removeNode(fromGraph, moving.id);
      const movedNode = {
        ...moving,
        position: nextPosition,
      };
      const nextTo = connect(
        {
          ...toGraph,
          nodes: [...toGraph.nodes, movedNode],
        },
        sourceParsed.nodeId,
        moving.id,
        connection.sourceHandle,
      );

      runCanvasChange("Connect", [fromOwner, toOwner], () => {
        writeGraph(fromOwner, nextFrom);
        writeGraph(toOwner, nextTo);
      });
    },
    [allowedByOwnerId, laneByOwnerId, runCanvasChange, updateGraph, writeGraph],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      openPaneMenu({ clientX: event.clientX, clientY: event.clientY });
    },
    [openPaneMenu],
  );

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("react-flow__pane")) return;
      openPaneMenu({ clientX: event.clientX, clientY: event.clientY });
    },
    [openPaneMenu],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;
      if (connectionState.toHandle) return;
      const fromNode = connectionState.fromNode;
      const fromHandle = connectionState.fromHandle;
      if (!fromNode || !fromHandle) return;
      if (isFenceNode(fromNode)) return;

      const parsed = parseFlowNodeId(fromNode.id);
      if (!parsed) return;
      const entry = entries.find((item) => item.ownerId === parsed.hotspotId);
      if (!entry) return;

      let allowed = entry.allowedNodeTypes;
      if (fromHandle.type === "source") {
        const sourceType =
          fromNode.type === TRIGGER_FLOW_TYPE ? undefined : fromNode.type;
        if (!canConnectToForEach(sourceType)) {
          allowed = allowed.filter((type) => type !== "forEach");
        }
      } else if (fromNode.type === "forEach") {
        allowed = allowed.filter((type) => canConnectToForEach(type));
      }
      if (allowed.length === 0) return;

      const client = clientPointFromConnectEvent(event);
      const flowPos = screenToFlowPosition({
        x: client.clientX,
        y: client.clientY,
      });
      const graphPos = toGraphPosition(
        flowPos.x,
        flowPos.y,
        entry.laneIndex,
      );

      skipNextPaneClickRef.current = true;
      setRawMenu({
        kind: "pane",
        x: menuPositionFromEvent(client).x,
        y: menuPositionFromEvent(client).y,
        hotspotId: parsed.hotspotId,
        flowPosition: placeNodeFromHandleDrop(graphPos, fromHandle.type),
        allowedNodeTypes: allowed,
        pendingConnect: {
          nodeId: parsed.nodeId,
          handleId: fromHandle.id ?? null,
          handleType: fromHandle.type,
        },
        laneLabel: entries.length > 1 ? laneLabelFor(entry) : undefined,
      });
    },
    [entries, menuPositionFromEvent, screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (isFenceNode(node)) return;
      const parsed = parseFlowNodeId(node.id);
      if (!parsed) return;
      const menuPos = menuPositionFromEvent(event);
      setRawMenu({
        kind: "node",
        x: menuPos.x,
        y: menuPos.y,
        hotspotId: parsed.hotspotId,
        nodeId: parsed.nodeId,
        deletable:
          parsed.nodeId !== TRIGGER_NODE_ID &&
          node.type !== TRIGGER_FLOW_TYPE,
      });
    },
    [menuPositionFromEvent],
  );

  const commitFenceMembership = useCallback(
    (moved: ActionsCanvasNode[]) => {
      const targets = moved.filter((item) => !isFenceNode(item));
      if (targets.length === 0) return;

      const latest = new Map<string, ActionsCanvasNode>();
      for (const item of nodesRef.current) latest.set(item.id, item);
      for (const item of targets) {
        const current = latest.get(item.id);
        latest.set(item.id, current ? { ...current, ...item } : item);
      }
      const all = [...latest.values()];
      const byId = nodesByIdMap(all);
      const fenceNodes = all.filter(isFenceNode);
      if (fenceNodes.length === 0) return;

      const memberships: Array<{ nodeId: string; fenceId: string | null }> = [];
      const nextParent = new Map<
        string,
        { parentId: string | undefined; position: { x: number; y: number } }
      >();

      for (const item of targets) {
        const current = latest.get(item.id) ?? item;
        const center = nodeCenter(current, byId);
        const containing = smallestContainingFence(center, fenceNodes);
        const currentParent = current.parentId;
        if (containing?.id === currentParent) continue;
        const abs = nodeAbsolutePosition(current, byId);
        if (containing) {
          nextParent.set(current.id, {
            parentId: containing.id,
            position: {
              x: abs.x - containing.position.x,
              y: abs.y - containing.position.y,
            },
          });
          memberships.push({ nodeId: current.id, fenceId: containing.id });
        } else if (currentParent) {
          nextParent.set(current.id, { parentId: undefined, position: abs });
          memberships.push({ nodeId: current.id, fenceId: null });
        }
      }

      if (nextParent.size === 0) return;
      setNodes((current) => {
        const next = current.map((item) => {
          const patch = nextParent.get(item.id);
          if (!patch) return item;
          return {
            ...item,
            parentId: patch.parentId,
            position: patch.position,
            expandParent: false,
            zIndex: patch.parentId ? 1 : undefined,
          };
        });
        const fenceNodesFirst = next.filter(isFenceNode);
        const actionNodes = next.filter((item) => !isFenceNode(item));
        return [...fenceNodesFirst, ...actionNodes];
      });
      applyMemberships(scopeKey, memberships);
    },
    [applyMemberships, scopeKey],
  );

  const onNodeDragStop: OnNodeDrag<ActionsCanvasNode> = useCallback(
    (_event, node, dragged) => {
      commitFenceMembership(dragged.length > 0 ? dragged : [node]);
    },
    [commitFenceMembership],
  );

  const handleAdd = useCallback(
    (
      ownerId: number,
      type: ActionNodeType,
      position: ActionNodeXY,
      pendingConnect?: ActionsPendingConnect,
    ) => {
      api.addNode(ownerId, type, position, pendingConnect);
    },
    [api],
  );

  const focusFlowNode = useCallback((flowId: string) => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === flowId,
      })),
    );
    setSelectedEdgeIds(new Set());
  }, []);

  useEffect(() => {
    setNodes((current) => {
      const fenceIds = new Set(canvasFences.map((fence) => fence.id));
      const fenceById = new Map(canvasFences.map((fence) => [fence.id, fence]));
      const before = nodesByIdMap(current);
      let changed = false;
      let next = current.filter((node) => {
        if (isFenceNode(node) && !fenceIds.has(node.id)) {
          changed = true;
          return false;
        }
        return true;
      });
      next = next.map((node) => {
        if (isFenceNode(node)) {
          const fence = fenceById.get(node.id);
          if (!fence) return node;
          const style = fenceNodeStyle(fence);
          if (
            node.width === fence.width &&
            node.height === fence.height &&
            node.style?.width === style.width &&
            node.style?.height === style.height &&
            node.style?.background === style.background &&
            node.style?.border === style.border
          ) {
            return node;
          }
          changed = true;
          return {
            ...node,
            width: fence.width,
            height: fence.height,
            style,
          };
        }
        if (!node.parentId || fenceIds.has(node.parentId)) return node;
        changed = true;
        return {
          ...node,
          parentId: undefined,
          position: nodeAbsolutePosition(node, before),
        };
      });
      for (const fence of canvasFences) {
        if (next.some((node) => node.id === fence.id)) continue;
        changed = true;
        next = [toFenceFlowNode(fence, scopeKey), ...next];
        // A restored fence (undo) takes its members back.
        const members = new Set(fence.memberIds);
        next = next.map((node) => {
          if (isFenceNode(node) || node.parentId || !members.has(node.id)) {
            return node;
          }
          return {
            ...node,
            parentId: fence.id,
            position: {
              x: node.position.x - fence.x,
              y: node.position.y - fence.y,
            },
            expandParent: false,
            zIndex: 1,
          };
        });
      }
      return changed ? next : current;
    });
  }, [canvasFences, scopeKey]);

  useEffect(() => {
    if (pendingCreate <= 0) return;
    consumeCreateFence();

    const selected = nodesRef.current.filter(
      (node) => node.selected && !isFenceNode(node),
    );
    const byId = nodesByIdMap(nodesRef.current);
    let fence = createActionFence(scopeKey);

    if (selected.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of selected) {
        const abs = nodeAbsolutePosition(node, byId);
        const width = node.measured?.width ?? 240;
        const height = node.measured?.height ?? 80;
        minX = Math.min(minX, abs.x);
        minY = Math.min(minY, abs.y);
        maxX = Math.max(maxX, abs.x + width);
        maxY = Math.max(maxY, abs.y + height);
      }
      const pad = 40;
      const header = 34;
      fence = createActionFence(scopeKey, {
        x: minX - pad,
        y: minY - pad - header,
        width: Math.max(280, maxX - minX + pad * 2),
        height: Math.max(180, maxY - minY + pad * 2 + header),
        memberIds: selected.map((node) => node.id),
      });
    } else {
      const rect = flowRootRef.current?.getBoundingClientRect();
      if (rect) {
        const center = screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        fence = createActionFence(scopeKey, {
          x: center.x - fence.width / 2,
          y: center.y - fence.height / 2,
        });
      } else {
        const viewport = getViewport();
        fence = createActionFence(scopeKey, {
          x: -viewport.x / viewport.zoom + 80,
          y: -viewport.y / viewport.zoom + 80,
        });
      }
    }

    addFence(scopeKey, fence);
    const created = fence;
    setNodes((current) => {
      const map = nodesByIdMap(current);
      const next = current.map((node) => {
        if (!created.memberIds.includes(node.id)) return node;
        const abs = nodeAbsolutePosition(node, map);
        return {
          ...node,
          parentId: created.id,
          position: { x: abs.x - created.x, y: abs.y - created.y },
          expandParent: false,
          zIndex: 1,
        };
      });
      return [toFenceFlowNode(created, scopeKey), ...next];
    });
  }, [
    addFence,
    consumeCreateFence,
    getViewport,
    pendingCreate,
    scopeKey,
    screenToFlowPosition,
  ]);

  return (
    <ActionsEditorProvider value={api}>
      <div
        ref={flowRootRef}
        className="editor-actions-flow relative h-full w-full"
        onDoubleClick={onPaneDoubleClick}
      >
        <ReactFlow<ActionsCanvasNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={ACTION_FLOW_NODE_TYPES}
          edgeTypes={ACTION_EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onBeforeDelete={onBeforeDelete}
          onEdgesDelete={onEdgesDelete}
          onDelete={onDelete}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStop={onNodeDragStop}
          onSelectionDragStop={(_event, dragged) =>
            commitFenceMembership(dragged)
          }
          onPaneClick={() => {
            if (skipNextPaneClickRef.current) {
              skipNextPaneClickRef.current = false;
              return;
            }
            setRawMenu(null);
          }}
          onEdgeClick={() => setRawMenu(null)}
          onInit={(instance) => {
            void instance.fitView({ padding: 0.2 });
          }}
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode="Shift"
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: ACTIONS_EDGE_TYPE,
            animated: true,
          }}
          isValidConnection={(connection) => {
            if (!connection.source || !connection.target) return false;
            const sourceParsed = parseFlowNodeId(connection.source);
            const targetParsed = parseFlowNodeId(connection.target);
            if (!sourceParsed || !targetParsed) return false;
            if (sourceParsed.nodeId === targetParsed.nodeId) return false;
            if (targetParsed.nodeId === TRIGGER_NODE_ID) return false;
            if (
              !canConnectActionOwners(
                sourceParsed.hotspotId,
                targetParsed.hotspotId,
              )
            ) {
              return false;
            }
            if (sourceParsed.hotspotId === targetParsed.hotspotId) {
              if (targetParsed.nodeId !== TRIGGER_NODE_ID) {
                const targetNode = nodesRef.current.find(
                  (node) => node.id === connection.target,
                );
                if (targetNode?.type === "forEach") {
                  const sourceNode = nodesRef.current.find(
                    (node) => node.id === connection.source,
                  );
                  return canConnectToForEach(sourceNode?.type);
                }
              }
              return true;
            }
            const allowed = allowedByOwnerId.get(sourceParsed.hotspotId);
            const targetNode = nodesRef.current.find(
              (node) => node.id === connection.target,
            );
            if (!targetNode || isFenceNode(targetNode)) return false;
            const targetType = targetNode.type;
            if (!targetType || targetType === TRIGGER_FLOW_TYPE) return false;
            return Boolean(allowed?.includes(targetType as ActionNodeType));
          }}
        >
          <Background gap={18} size={1} color="rgba(120, 160, 230, 0.18)" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(11, 20, 36, 0.7)"
            nodeColor={() => "rgba(230, 57, 70, 0.55)"}
          />
        </ReactFlow>

        <div
          className="editor-actions-toolbar nodrag nopan"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="editor-actions-add-btn"
            title="Add an action. It connects after the selected node, or the last node in the lane."
            onClick={onAddButtonClick}
          >
            <Plus />
            Add action
          </button>
          <div className="editor-actions-history" role="group" aria-label="History">
            <IconButton
              title={`Undo (${shortcutLabel("Z")})`}
              aria-label="Undo"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 />
            </IconButton>
            <IconButton
              title={`Redo (${shortcutLabel("Z", true)})`}
              aria-label="Redo"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 />
            </IconButton>
          </div>
        </div>

        <ActionsCanvasSearch entries={entries} onFocused={focusFlowNode} />

        <ActionsContextMenu
          menu={menu}
          onClose={() => setRawMenu(null)}
          onAdd={handleAdd}
          onDelete={api.deleteNode}
        />
        {isolatedLane ? null : <SpawnHotspotTemplateDrawer />}
      </div>
    </ActionsEditorProvider>
  );
}

export function ActionsFlow({
  hotspots,
  includeStartGraphs = false,
  isolatedLane,
}: ActionsFlowProps) {
  const [clipboard, setClipboard] = useState<ActionNode | null>(null);
  const activeScene = useActiveScene();
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const canvasSessionKey = canvasSessionKeyFor(
    activeScene.id,
    hotspots,
    includeStartGraphs,
    customMenuButtons.map((button) => button.ownerId),
    legendEnabled,
    isolatedLane?.fenceScopeKey,
  );

  if (!isolatedLane && !includeStartGraphs && hotspots.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[13px]"
        style={{ color: "var(--editor-muted)" }}
      >
        No hotspots in this scene yet. Add a hotspot to define actions.
      </div>
    );
  }

  return (
    <ReactFlowProvider key={canvasSessionKey}>
      <ActionsFlowCanvas
        hotspots={hotspots}
        includeStartGraphs={includeStartGraphs}
        isolatedLane={isolatedLane}
        clipboard={clipboard}
        onClipboardChange={setClipboard}
      />
    </ReactFlowProvider>
  );
}
