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
  type Node,
  type NodeChange,
  type OnConnect,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useRef, useState } from "react";
import { ACTION_FLOW_NODE_TYPES } from "@/app/editor/_components/actions/action-node-registry";
import {
  ActionsContextMenu,
  type ActionsContextMenuState,
} from "@/app/editor/_components/actions/actions-context-menu";
import {
  ActionsEditorProvider,
  type ActionsEditorApi,
} from "@/app/editor/_components/actions/actions-editor-context";
import {
  APP_START_OWNER_ID,
  HOTSPOT_GRAPH_ALLOWED_NODE_TYPES,
  SCENE_START_OWNER_ID,
  START_GRAPH_ALLOWED_NODE_TYPES,
  canConnectActionOwners,
  getOwnedActionGraph,
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
  moveNode,
  removeNode,
  updateNodeData,
} from "@/lib/editor/actions/graph-ops";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useActiveScene, useScenesStore } from "@/lib/editor/state/scenes-store";
import type {
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";
import type { Hotspot } from "@/lib/editor/types/hotspot";

type ActionsFlowProps = {
  hotspots: Hotspot[];
  /** Prepend App Start + Scene Start lanes (scene-wide Actions modal). */
  includeStartGraphs?: boolean;
};

function graphFingerprint(graph: HotspotActionGraph): string {
  const nodes = graph.nodes.map((n) => `${n.id}:${n.type}`).join(",");
  const edges = graph.edges.map((e) => `${e.source}>${e.target}`).join(",");
  return `${nodes}|${edges}`;
}

/**
 * Structural fingerprint — remount only when nodes/edges are added/removed/
 * reconnected. Editable fields (url, sceneId) must NOT be included or inputs
 * remount and lose focus on every keystroke.
 */
function structureKeyFor(
  hotspots: Hotspot[],
  includeStartGraphs: boolean,
  appStartActions: HotspotActionGraph,
  sceneStartActions: HotspotActionGraph,
): string {
  const hotspotKey = hotspots
    .map((h) => {
      const g = getActionGraph(h);
      return `${h.id}[${graphFingerprint(g)}]`;
    })
    .join("||");

  if (!includeStartGraphs) return hotspotKey;

  return [
    `app[${graphFingerprint(appStartActions)}]`,
    `scene[${graphFingerprint(sceneStartActions)}]`,
    hotspotKey,
  ].join("||");
}

function ActionsFlowCanvas({
  hotspots,
  includeStartGraphs = false,
}: ActionsFlowProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const activeScene = useActiveScene();
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const { screenToFlowPosition } = useReactFlow();
  const flowRootRef = useRef<HTMLDivElement>(null);
  const [rawMenu, setRawMenu] = useState<ActionsContextMenuState | null>(null);

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

    if (includeStartGraphs) {
      list.push({
        ownerId: APP_START_OWNER_ID,
        title: "All scenes",
        graph: appStartActions ?? createEmptyActionGraph(),
        laneIndex: laneIndex++,
        triggerKind: "appStart",
        allowedNodeTypes: START_GRAPH_ALLOWED_NODE_TYPES,
      });
      list.push({
        ownerId: SCENE_START_OWNER_ID,
        title: activeScene.name,
        graph: activeScene.startActions ?? createEmptyActionGraph(),
        laneIndex: laneIndex++,
        triggerKind: "sceneStart",
        allowedNodeTypes: START_GRAPH_ALLOWED_NODE_TYPES,
      });
    }

    for (const hotspot of hotspots) {
      list.push({
        ownerId: hotspot.id,
        title: hotspot.title,
        graph: getActionGraph(hotspot),
        laneIndex: laneIndex++,
        triggerKind: "hotspot",
        allowedNodeTypes: HOTSPOT_GRAPH_ALLOWED_NODE_TYPES,
      });
    }

    return list;
  }, [
    activeScene.name,
    activeScene.startActions,
    appStartActions,
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

  const { nodes: initialNodes, edges } = useMemo(
    () => toFlowGraph(entries),
    [entries],
  );
  const [nodes, setNodes] =
    useState<Node<ActionFlowNodeData>[]>(initialNodes);

  const writeGraph = useCallback(
    (ownerId: number, graph: HotspotActionGraph) => {
      if (ownerId === APP_START_OWNER_ID || ownerId === SCENE_START_OWNER_ID) {
        setOwnedActionGraph(ownerId, graph);
        return;
      }
      updateHotspot(ownerId, { actions: graph });
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
    }),
    [allowedByOwnerId, updateGraph],
  );

  const onNodesChange: OnNodesChange<Node<ActionFlowNodeData>> = useCallback(
    (changes: NodeChange<Node<ActionFlowNodeData>>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));

      for (const change of changes) {
        if (
          change.type === "position" &&
          change.position &&
          change.dragging === false
        ) {
          const parsed = parseFlowNodeId(change.id);
          if (!parsed) continue;
          const laneIndex = laneByOwnerId.get(parsed.hotspotId) ?? 0;
          const position = toGraphPosition(
            change.position.x,
            change.position.y,
            laneIndex,
          );
          updateGraph(parsed.hotspotId, (graph) =>
            moveNode(graph, parsed.nodeId, position),
          );
        }
      }
    },
    [laneByOwnerId, updateGraph],
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
          connect(graph, sourceParsed.nodeId, targetParsed.nodeId),
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

  const handleAdd = useCallback(
    (ownerId: number, type: ActionNodeType, position: ActionNodeXY) => {
      api.addNode(ownerId, type, position);
    },
    [api],
  );

  return (
    <ActionsEditorProvider value={api}>
      <div ref={flowRootRef} className="editor-actions-flow relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={ACTION_FLOW_NODE_TYPES}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={() => setRawMenu(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={null}
          multiSelectionKeyCode={null}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "smoothstep",
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
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const activeScene = useActiveScene();
  const sceneStartActions =
    activeScene.startActions ?? createEmptyActionGraph();
  const structureKey = structureKeyFor(
    hotspots,
    includeStartGraphs,
    appStartActions,
    sceneStartActions,
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
    <ReactFlowProvider key={structureKey}>
      <ActionsFlowCanvas
        hotspots={hotspots}
        includeStartGraphs={includeStartGraphs}
      />
    </ReactFlowProvider>
  );
}
