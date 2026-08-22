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
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  attachNodesToFences,
  fenceNodeStyle,
  fencesVisibleOnCanvas,
  isFenceNode,
  nodeAbsolutePosition,
  nodeCenter,
  nodesByIdMap,
  pointInFence,
  smallestContainingFence,
  toFenceFlowNode,
  type ActionsCanvasNode,
} from "@/lib/editor/actions/action-fences";
import { ACTION_FLOW_NODE_TYPES } from "@/app/editor/_components/actions/action-node-registry";
import { ActionsCanvasSearch } from "@/app/editor/_components/actions/actions-canvas-search";
import {
  ActionsContextMenu,
  type ActionsContextMenuState,
} from "@/app/editor/_components/actions/actions-context-menu";
import { ActionsEdge, ACTIONS_EDGE_TYPE } from "@/app/editor/_components/actions/actions-edge";
import {
  ActionsEditorProvider,
  type ActionsEditorApi,
} from "@/app/editor/_components/actions/actions-editor-context";
import {
  APP_START_OWNER_ID,
  HOTSPOT_GRAPH_ALLOWED_NODE_TYPES,
  MENU_BUTTON_GRAPH_ALLOWED_NODE_TYPES,
  SCENE_START_OWNER_ID,
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
import { filterActionNodeTypesForScene } from "@/lib/editor/actions/registry";
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
} from "@/lib/editor/types/action-fence";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";
import type { Hotspot } from "@/lib/editor/types/hotspot";

type ActionsFlowProps = {
  hotspots: Hotspot[];
  /** Prepend App Start + Scene Start lanes (scene-wide Actions modal). */
  includeStartGraphs?: boolean;
};

type ActionsFlowCanvasProps = ActionsFlowProps & {
  clipboard: ActionNode | null;
  onClipboardChange: (node: ActionNode | null) => void;
};

const ACTION_EDGE_TYPES = { [ACTIONS_EDGE_TYPE]: ActionsEdge };

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
): string {
  const owners = includeStartGraphs
    ? ["app", "scene", ...menuButtonOwnerIds.map((id) => `m${id}`)]
    : [];
  for (const hotspot of hotspots) owners.push(`h${hotspot.id}`);
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
  clipboard,
  onClipboardChange,
}: ActionsFlowCanvasProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const activeScene = useActiveScene();
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const flowRootRef = useRef<HTMLDivElement>(null);
  const [rawMenu, setRawMenu] = useState<ActionsContextMenuState | null>(null);
  const scopeKey = actionFencesScopeKey(activeScene.id);
  const storeFences = useActionFencesStore((s) => s.byScope[scopeKey]);
  const fences = storeFences ?? activeScene.actionFences ?? [];
  const pendingCreate = useActionFencesStore((s) => s.pendingCreate);
  const consumeCreateFence = useActionFencesStore((s) => s.consumeCreateFence);
  const addFence = useActionFencesStore((s) => s.addFence);
  const updateFence = useActionFencesStore((s) => s.updateFence);
  const removeFence = useActionFencesStore((s) => s.removeFence);
  const applyMemberships = useActionFencesStore((s) => s.applyMemberships);
  const hydrateScope = useActionFencesStore((s) => s.hydrateScope);
  const setFences = useActionFencesStore((s) => s.setFences);

  useLayoutEffect(() => {
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
  }, [activeScene.actionFences, hydrateScope, scopeKey, setFences]);

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
    const list: ActionFlowEntry[] = [];
    let laneIndex = 0;
    const forScene = (types: ActionNodeType[]) =>
      filterActionNodeTypesForScene(types, activeScene.type);

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
        allowedNodeTypes: forScene(START_GRAPH_ALLOWED_NODE_TYPES),
      });
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
      return list;
    }

    // Hotspot-only canvas uses the same lane Y as Scene Actions so fences
    // (stored in scene flow coords) line up with these nodes.
    const sceneLaneBase = 2 + customMenuButtons.length;
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

    return list;
  }, [
    activeScene.hotspots,
    activeScene.name,
    activeScene.startActions,
    activeScene.type,
    appStartActions,
    customMenuButtons,
    hotspots,
    includeStartGraphs,
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
          data.toggleEnabled === entry.toggleEnabled
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
      if (isHotspotOwnerId(ownerId)) {
        updateHotspot(ownerId, { actions: graph });
        return;
      }
      setOwnedActionGraph(ownerId, graph);
    },
    [updateHotspot],
  );

  const updateGraph = useCallback(
    (
      ownerId: number,
      updater: (graph: HotspotActionGraph) => HotspotActionGraph,
    ) => {
      const current = getOwnedActionGraph(ownerId);
      if (!current) return;
      writeGraph(ownerId, updater(current));
    },
    [writeGraph],
  );

  const api: ActionsEditorApi = useMemo(
    () => ({
      updateGraph,
      deleteNode: (ownerId, nodeId) => {
        updateGraph(ownerId, (graph) => removeNode(graph, nodeId));
      },
      deleteEdge: (ownerId, edgeId) => {
        updateGraph(ownerId, (graph) => removeEdge(graph, edgeId));
      },
      updateNodeData: (ownerId, nodeId, patch) => {
        updateGraph(ownerId, (graph) => updateNodeData(graph, nodeId, patch));
      },
      addNode: (ownerId, type, position) => {
        const allowed =
          allowedByOwnerId.get(ownerId) ?? HOTSPOT_GRAPH_ALLOWED_NODE_TYPES;
        if (!allowed.includes(type)) return;
        updateGraph(ownerId, (graph) => {
          const { graph: next } = addNode(graph, type, position);
          return next;
        });
      },
      clipboard,
      copyNode: (ownerId, nodeId) => {
        const graph = getOwnedActionGraph(ownerId);
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
        const graph = getOwnedActionGraph(ownerId);
        if (!graph) return false;
        const position =
          target?.position ?? pastePositionNear(graph, target?.nearNodeId);
        writeGraph(ownerId, insertClonedNode(graph, clipboard, position));
        return true;
      },
    }),
    [allowedByOwnerId, clipboard, onClipboardChange, updateGraph, writeGraph],
  );

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
        updateGraph(sourceParsed.hotspotId, (graph) =>
          connect(
            graph,
            sourceParsed.nodeId,
            targetParsed.nodeId,
            connection.sourceHandle,
          ),
        );
        return;
      }

      // App Start ↔ Scene Start: move the target node into the source graph.
      const fromOwner = targetParsed.hotspotId;
      const toOwner = sourceParsed.hotspotId;
      const fromGraph = getOwnedActionGraph(fromOwner);
      const toGraph = getOwnedActionGraph(toOwner);
      if (!fromGraph || !toGraph) return;

      const moving = fromGraph.nodes.find((n) => n.id === targetParsed.nodeId);
      if (!moving) return;

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

      writeGraph(fromOwner, nextFrom);
      writeGraph(toOwner, nextTo);
    },
    [laneByOwnerId, updateGraph, writeGraph],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      if (entries.length === 0) return;

      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

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

      const graphPos = toGraphPosition(flowPos.x, flowPos.y, best.laneIndex);
      const menuPos = menuPositionFromEvent(event);
      setRawMenu({
        kind: "pane",
        x: menuPos.x,
        y: menuPos.y,
        hotspotId: best.ownerId,
        flowPosition: graphPos,
        allowedNodeTypes: best.allowedNodeTypes,
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
    (ownerId: number, type: ActionNodeType, position: ActionNodeXY) => {
      api.addNode(ownerId, type, position);
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
      <div ref={flowRootRef} className="editor-actions-flow relative h-full w-full">
        <ReactFlow<ActionsCanvasNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={ACTION_FLOW_NODE_TYPES}
          edgeTypes={ACTION_EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStop={onNodeDragStop}
          onSelectionDragStop={(_event, dragged) =>
            commitFenceMembership(dragged)
          }
          onPaneClick={() => setRawMenu(null)}
          onEdgeClick={() => setRawMenu(null)}
          onInit={(instance) => {
            void instance.fitView({ padding: 0.2 });
          }}
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode="Shift"
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
            return canConnectActionOwners(
              sourceParsed.hotspotId,
              targetParsed.hotspotId,
            );
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

        <ActionsCanvasSearch entries={entries} onFocused={focusFlowNode} />

        <ActionsContextMenu
          menu={menu}
          onClose={() => setRawMenu(null)}
          onAdd={handleAdd}
          onDelete={api.deleteNode}
        />
      </div>
    </ActionsEditorProvider>
  );
}

export function ActionsFlow({
  hotspots,
  includeStartGraphs = false,
}: ActionsFlowProps) {
  const [clipboard, setClipboard] = useState<ActionNode | null>(null);
  const activeScene = useActiveScene();
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const canvasSessionKey = canvasSessionKeyFor(
    activeScene.id,
    hotspots,
    includeStartGraphs,
    customMenuButtons.map((button) => button.ownerId),
  );

  if (!includeStartGraphs && hotspots.length === 0) {
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
        clipboard={clipboard}
        onClipboardChange={setClipboard}
      />
    </ReactFlowProvider>
  );
}
