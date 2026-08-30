import {
  findActionNodeOwner,
  findHttpRequestNodeById,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import { getHttpRequestCached, httpRequestCacheKey } from "@/lib/editor/actions/http-request";
import {
  resolveActionFieldValue,
  unwrapFieldPath,
  withActionItemScope,
} from "@/lib/editor/actions/interpolate-fields";
import {
  getValueByPath,
  isJsonRootPath,
  tryParseJson,
} from "@/lib/editor/blocks/json-paths";
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

function predecessorJsonValue(
  graph: HotspotActionGraph,
  nodeId: string,
): unknown {
  for (const source of incomingSources(graph, nodeId)) {
    if (source.type === "httpRequest") {
      const found = findHttpRequestNodeById(source.id);
      if (found) {
        const key = httpRequestCacheKey(
          ownerKeyFor(found.ownerId),
          found.node.id,
        );
        const runtime = getHttpRequestCached(key);
        if (runtime !== undefined) return runtime;
      }
      return tryParseJson(source.data.lastResponseJson ?? "");
    }
    if (source.type === "sendPostMessage") {
      return tryParseJson(source.data.lastPayloadJson ?? "");
    }
  }
  return undefined;
}

function asItemArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function resolveItemsPathValue(itemsPath: string): unknown {
  const { path, nodeId } = unwrapFieldPath(itemsPath);
  if (!path) return undefined;
  return resolveActionFieldValue(path, nodeId);
}

export function resolveForEachItems(
  itemsPath: string,
  graph?: HotspotActionGraph,
  nodeId?: string,
): unknown[] | null {
  const { path, nodeId: tokenNodeId } = unwrapFieldPath(itemsPath);
  const ownerGraph =
    graph ?? (nodeId ? findActionNodeOwner(nodeId)?.graph : null) ?? null;
  const predecessor =
    ownerGraph && nodeId
      ? predecessorJsonValue(ownerGraph, nodeId)
      : undefined;

  if (!path || isJsonRootPath(path)) {
    if (path) {
      const fromToken = asItemArray(
        resolveActionFieldValue(path, tokenNodeId),
      );
      if (fromToken) return fromToken;
    }
    return asItemArray(predecessor);
  }

  const fromPath = asItemArray(resolveActionFieldValue(path, tokenNodeId));
  if (fromPath) return fromPath;
  if (predecessor !== undefined) {
    const nested = asItemArray(getValueByPath(predecessor, path));
    if (nested) return nested;
    if (
      Array.isArray(predecessor) &&
      (path === "items" || path === "data")
    ) {
      return predecessor;
    }
  }
  return null;
}

/** Sample array from the upstream HTTP / Post Message JSON (editor preview). */
export function sampleForEachItems(
  graph: HotspotActionGraph,
  node: ForEachActionNode,
): unknown[] | null {
  return resolveForEachItems(node.data.itemsPath, graph, node.id);
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
  if (!node.data.itemsPath.trim()) {
    if (resolved && sampleForEachItems(resolved, node)) return null;
    return "Select an array field";
  }
  return null;
}

export async function runForEach(
  node: ForEachActionNode,
  runTail: (item: unknown, index: number) => Promise<void>,
): Promise<"stop"> {
  const owner = findActionNodeOwner(node.id);
  const items = resolveForEachItems(
    node.data.itemsPath,
    owner?.graph,
    node.id,
  );
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
