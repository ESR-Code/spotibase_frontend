import type { Node } from "@xyflow/react";
import {
  ACTION_FENCE_TYPE,
  isActionFenceId,
  type ActionFence,
  type ActionFenceData,
} from "@/lib/editor/types/action-fence";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";

export type ActionsCanvasNode = Node<ActionFlowNodeData | ActionFenceData>;

export function isFenceNode(
  node: Node,
): node is Node<ActionFenceData, typeof ACTION_FENCE_TYPE> {
  return node.type === ACTION_FENCE_TYPE || isActionFenceId(node.id);
}

export function fenceNodeStyle(fence: Pick<ActionFence, "width" | "height" | "color">) {
  const color = fence.color || "#4361ee";
  return {
    width: fence.width,
    height: fence.height,
    background: `${color}18`,
    border: `1.5px solid ${color}99`,
  };
}

export function toFenceFlowNode(
  fence: ActionFence,
  scopeKey: string,
): Node<ActionFenceData, typeof ACTION_FENCE_TYPE> {
  return {
    id: fence.id,
    type: ACTION_FENCE_TYPE,
    position: { x: fence.x, y: fence.y },
    width: fence.width,
    height: fence.height,
    style: fenceNodeStyle(fence),
    data: {
      name: fence.name,
      color: fence.color,
      scopeKey,
    },
    zIndex: -1,
    draggable: true,
    selectable: true,
    connectable: false,
    deletable: true,
    dragHandle: ".editor-action-fence",
  };
}

export function nodeAbsolutePosition(
  node: Node,
  byId: Map<string, Node>,
): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

export function nodeCenter(
  node: Node,
  byId: Map<string, Node>,
): { x: number; y: number } {
  const abs = nodeAbsolutePosition(node, byId);
  const width = node.measured?.width ?? node.width ?? 240;
  const height = node.measured?.height ?? node.height ?? 72;
  return { x: abs.x + width / 2, y: abs.y + height / 2 };
}

export function fenceBounds(node: Node): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const width =
    node.measured?.width ??
    node.width ??
    (typeof node.style?.width === "number" ? node.style.width : 440);
  const height =
    node.measured?.height ??
    node.height ??
    (typeof node.style?.height === "number" ? node.style.height : 300);
  return { x: node.position.x, y: node.position.y, width, height };
}

export function pointInFence(
  point: { x: number; y: number },
  fence: Node,
): boolean {
  const box = fenceBounds(fence);
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

export function smallestContainingFence(
  point: { x: number; y: number },
  fences: Node[],
): Node | undefined {
  let best: Node | undefined;
  let bestArea = Infinity;
  for (const fence of fences) {
    if (!pointInFence(point, fence)) continue;
    const box = fenceBounds(fence);
    const area = box.width * box.height;
    if (area < bestArea) {
      best = fence;
      bestArea = area;
    }
  }
  return best;
}

/**
 * Which fences to draw on a canvas.
 * Scene canvas: all fences.
 * Hotspot canvas: fences that group this hotspot's nodes, or empty fences whose
 * bounds sit on this hotspot's lane (so a new empty fence stays visible).
 */
export function fencesVisibleOnCanvas(
  fences: ActionFence[],
  visibleNodeIds: Set<string>,
  options:
    | { includeAll: true }
    | {
        includeAll: false;
        laneIndex: number;
        laneHeight: number;
      },
): ActionFence[] {
  if (options.includeAll) return fences;

  const laneTop = options.laneIndex * options.laneHeight;
  const laneBottom = laneTop + options.laneHeight;

  return fences.filter((fence) => {
    if (fence.memberIds.some((id) => visibleNodeIds.has(id))) return true;
    if (fence.memberIds.length > 0) return false;
    const fenceBottom = fence.y + fence.height;
    return fenceBottom > laneTop && fence.y < laneBottom;
  });
}

export function attachNodesToFences(
  actionNodes: Node<ActionFlowNodeData>[],
  fences: ActionFence[],
  scopeKey: string,
): ActionsCanvasNode[] {
  const liveIds = new Set(actionNodes.map((node) => node.id));
  const memberToFence = new Map<string, ActionFence>();
  for (const fence of fences) {
    for (const id of fence.memberIds) {
      if (liveIds.has(id)) memberToFence.set(id, fence);
    }
  }

  const fenceNodes = fences.map((fence) => toFenceFlowNode(fence, scopeKey));
  const nextActions: ActionsCanvasNode[] = actionNodes.map((node) => {
    const fence = memberToFence.get(node.id);
    if (!fence) {
      if (!node.parentId) return node;
      return { ...node, parentId: undefined };
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

  return [...fenceNodes, ...nextActions];
}

export function nodesByIdMap(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((node) => [node.id, node]));
}
