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
import { useCallback, useMemo, useState } from "react";
import { ACTION_FLOW_NODE_TYPES } from "@/app/editor/_components/actions/action-node-registry";
import {
  ActionsContextMenu,
  type ActionsContextMenuState,
} from "@/app/editor/_components/actions/actions-context-menu";
import {
  ActionsEditorProvider,
  type ActionsEditorApi,
} from "@/app/editor/_components/actions/actions-editor-context";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import {
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
import type {
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";
import type { Hotspot } from "@/lib/editor/types/hotspot";

type ActionsFlowProps = {
  hotspots: Hotspot[];
};

/**
 * Structural fingerprint — remount only when nodes/edges are added/removed/
 * reconnected. Editable fields (url, sceneId) must NOT be included or inputs
 * remount and lose focus on every keystroke.
 */
function structureKeyFor(hotspots: Hotspot[]): string {
  return hotspots
    .map((h) => {
      const g = getActionGraph(h);
      const nodes = g.nodes.map((n) => `${n.id}:${n.type}`).join(",");
      const edges = g.edges.map((e) => `${e.source}>${e.target}`).join(",");
      return `${h.id}[${nodes}|${edges}]`;
    })
    .join("||");
}

function ActionsFlowCanvas({ hotspots }: ActionsFlowProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const { screenToFlowPosition } = useReactFlow();
  const [rawMenu, setRawMenu] = useState<ActionsContextMenuState | null>(null);

  const laneByHotspotId = useMemo(() => {
    const map = new Map<number, number>();
    hotspots.forEach((h, index) => map.set(h.id, index));
    return map;
  }, [hotspots]);

  const hotspotIds = useMemo(
    () => new Set(hotspots.map((h) => h.id)),
    [hotspots],
  );

  const menu =
    rawMenu && hotspotIds.has(rawMenu.hotspotId) ? rawMenu : null;

  const entries: ActionFlowEntry[] = useMemo(
    () =>
      hotspots.map((hotspot, laneIndex) => ({
        hotspot,
        graph: getActionGraph(hotspot),
        laneIndex,
      })),
    [hotspots],
  );

  const { nodes: initialNodes, edges } = useMemo(
    () => toFlowGraph(entries),
    [entries],
  );
  const [nodes, setNodes] =
    useState<Node<ActionFlowNodeData>[]>(initialNodes);

  const writeGraph = useCallback(
    (hotspotId: number, graph: HotspotActionGraph) => {
      updateHotspot(hotspotId, { actions: graph });
    },
    [updateHotspot],
  );

  const updateGraph = useCallback(
    (
      hotspotId: number,
      updater: (graph: HotspotActionGraph) => HotspotActionGraph,
    ) => {
      const hotspot = useEditorStore
        .getState()
        .hotspots.find((h) => h.id === hotspotId);
      if (!hotspot) return;
      writeGraph(hotspotId, updater(getActionGraph(hotspot)));
    },
    [writeGraph],
  );

  const api: ActionsEditorApi = useMemo(
    () => ({
      updateGraph,
      deleteNode: (hotspotId, nodeId) => {
        updateGraph(hotspotId, (graph) => removeNode(graph, nodeId));
      },
      updateNodeData: (hotspotId, nodeId, patch) => {
        updateGraph(hotspotId, (graph) =>
          updateNodeData(graph, nodeId, patch),
        );
      },
      addNode: (hotspotId, type, position) => {
        updateGraph(hotspotId, (graph) => {
          const { graph: next } = addNode(graph, type, position);
          return next;
        });
      },
    }),
    [updateGraph],
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
          const laneIndex = laneByHotspotId.get(parsed.hotspotId) ?? 0;
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
    [laneByHotspotId, updateGraph],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceParsed = parseFlowNodeId(connection.source);
      const targetParsed = parseFlowNodeId(connection.target);
      if (!sourceParsed || !targetParsed) return;
      if (sourceParsed.hotspotId !== targetParsed.hotspotId) return;

      updateGraph(sourceParsed.hotspotId, (graph) =>
        connect(graph, sourceParsed.nodeId, targetParsed.nodeId),
      );
    },
    [updateGraph],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      if (hotspots.length === 0) return;

      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let best = hotspots[0]!;
      let bestLane = 0;
      let bestDist = Infinity;
      hotspots.forEach((h, laneIndex) => {
        const localY = toGraphPosition(flowPos.x, flowPos.y, laneIndex).y;
        const dist = Math.abs(localY - 120);
        if (dist < bestDist) {
          bestDist = dist;
          best = h;
          bestLane = laneIndex;
        }
      });

      const graphPos = toGraphPosition(flowPos.x, flowPos.y, bestLane);
      setRawMenu({
        kind: "pane",
        x: event.clientX,
        y: event.clientY,
        hotspotId: best.id,
        flowPosition: graphPos,
      });
    },
    [hotspots, screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const parsed = parseFlowNodeId(node.id);
      if (!parsed) return;
      setRawMenu({
        kind: "node",
        x: event.clientX,
        y: event.clientY,
        hotspotId: parsed.hotspotId,
        nodeId: parsed.nodeId,
        deletable:
          parsed.nodeId !== TRIGGER_NODE_ID &&
          node.type !== TRIGGER_FLOW_TYPE,
      });
    },
    [],
  );

  const handleAdd = useCallback(
    (hotspotId: number, type: ActionNodeType, position: ActionNodeXY) => {
      api.addNode(hotspotId, type, position);
    },
    [api],
  );

  return (
    <ActionsEditorProvider value={api}>
      <div className="editor-actions-flow relative h-full w-full">
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
            if (sourceParsed.hotspotId !== targetParsed.hotspotId) return false;
            if (sourceParsed.nodeId === targetParsed.nodeId) return false;
            if (targetParsed.nodeId === TRIGGER_NODE_ID) return false;
            return true;
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

export function ActionsFlow({ hotspots }: ActionsFlowProps) {
  const structureKey = structureKeyFor(hotspots);

  if (hotspots.length === 0) {
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
      <ActionsFlowCanvas hotspots={hotspots} />
    </ReactFlowProvider>
  );
}
