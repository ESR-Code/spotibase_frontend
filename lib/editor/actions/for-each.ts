import { findActionNodeOwner } from "@/lib/editor/actions/action-owners";
import {
  resolveActionFieldValue,
  unwrapFieldPath,
  withActionItemScope,
} from "@/lib/editor/actions/interpolate-fields";
import { getValueByPath, tryParseJson } from "@/lib/editor/blocks/json-paths";
import type {
  ActionNode,
  ForEachActionNode,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

export const FOR_EACH_MAX_ITEMS = 200;

export function isForEachSourceType(
  type: ActionNode["type"] | string | undefined,
): boolean {
  return type === "httpRequest" || type === "sendPostMessage";
}

export function incomingSources(
  graph: HotspotActionGraph,
  nodeId: string,
): ActionNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const sources: ActionNode[] = [];
  for (const edge of graph.edges) {
    if (edge.target !== nodeId) continue;
    const source = byId.get(edge.source);
    if (source) sources.push(source);
  }
  return sources;
}

export function hasAncestorOfType(
  graph: HotspotActionGraph,
  nodeId: string,
  type: ActionNode["type"],
): boolean {
  const visited = new Set<string>();
  const queue = incomingSources(graph, nodeId).map((node) => node.id);
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const node = graph.nodes.find((item) => item.id === currentId);
    if (!node) continue;
    if (node.type === type) return true;
    for (const source of incomingSources(graph, currentId)) {
      queue.push(source.id);
    }
  }
  return false;
}

export function hasForEachAncestor(
  graph: HotspotActionGraph,
  nodeId: string,
): boolean {
  return hasAncestorOfType(graph, nodeId, "forEach");
}

export function findUpstreamForEach(
  graph: HotspotActionGraph,
  nodeId: string,
): ForEachActionNode | null {
  const visited = new Set<string>();
  const queue = incomingSources(graph, nodeId).map((node) => node.id);
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const node = graph.nodes.find((item) => item.id === currentId);
    if (!node) continue;
    if (node.type === "forEach") return node;
    for (const source of incomingSources(graph, currentId)) {
      queue.push(source.id);
    }
  }
  return null;
}

export function hasHttpOrPostMessagePredecessor(
  graph: HotspotActionGraph,
  nodeId: string,
): boolean {
  return incomingSources(graph, nodeId).some((node) =>
    isForEachSourceType(node.type),
  );
}

export function canConnectToForEach(
  sourceType: ActionNode["type"] | string | undefined,
): boolean {
  return isForEachSourceType(sourceType);
}

function predecessorSampleJson(
  graph: HotspotActionGraph,
  nodeId: string,
): string {
  for (const source of incomingSources(graph, nodeId)) {
    if (source.type === "httpRequest") {
      return source.data.lastResponseJson ?? "";
    }
    if (source.type === "sendPostMessage") {
      return source.data.lastPayloadJson ?? "";
    }
  }
  return "";
}

export function resolveItemsPathValue(itemsPath: string): unknown {
  const { path, nodeId } = unwrapFieldPath(itemsPath);
  if (!path) return undefined;
  return resolveActionFieldValue(path, nodeId);
}

export function resolveForEachItems(itemsPath: string): unknown[] | null {
  const value = resolveItemsPathValue(itemsPath);
  return Array.isArray(value) ? value : null;
}

/** Sample array from the upstream HTTP / Post Message JSON (editor preview). */
export function sampleForEachItems(
  graph: HotspotActionGraph,
  node: ForEachActionNode,
): unknown[] | null {
  const { path } = unwrapFieldPath(node.data.itemsPath);
  if (!path) return null;
  const parsed = tryParseJson(predecessorSampleJson(graph, node.id));
  if (parsed === undefined) {
    const live = resolveItemsPathValue(node.data.itemsPath);
    return Array.isArray(live) ? live : null;
  }
  const value = getValueByPath(parsed, path);
  return Array.isArray(value) ? value : null;
}

export function countForEachSampleItems(
  graph: HotspotActionGraph,
  node: ForEachActionNode,
): number | null {
  const items = sampleForEachItems(graph, node);
  return items ? items.length : null;
}

export function validateForEachData(
  node: ActionNode,
  graph?: HotspotActionGraph,
): string | null {
  if (node.type !== "forEach") return null;
  const resolved =
    graph ?? findActionNodeOwner(node.id)?.graph ?? null;
  if (resolved) {
    if (hasForEachAncestor(resolved, node.id)) {
      return "For Each cannot be nested";
    }
    if (!hasHttpOrPostMessagePredecessor(resolved, node.id)) {
      return "Connect For Each after HTTP Request or Post Message";
    }
  }
  if (!node.data.itemsPath.trim()) return "Select an array field";
  return null;
}

export async function runForEach(
  node: ForEachActionNode,
  runTail: (item: unknown, index: number) => Promise<void>,
): Promise<"stop"> {
  const items = resolveForEachItems(node.data.itemsPath);
  if (items == null) {
    return "stop";
  }
  const limited = items.slice(0, FOR_EACH_MAX_ITEMS);
  for (let index = 0; index < limited.length; index++) {
    await withActionItemScope(limited[index], index, () =>
      runTail(limited[index], index),
    );
  }
  return "stop";
}
