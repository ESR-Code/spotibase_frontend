import { flattenJsonPaths, tryParseJson } from "@/lib/editor/blocks/json-paths";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import type { Hotspot } from "@/lib/editor/types/hotspot";

export type HttpFieldSource = {
  nodeId: string;
  nodeLabel: string;
  path: string;
  sample: string;
};

/** Collect selectable JSON field paths from tested HTTP Request nodes. */
export function listHttpFieldSources(hotspot: Hotspot): HttpFieldSource[] {
  const graph = getActionGraph(hotspot);
  const sources: HttpFieldSource[] = [];

  graph.nodes.forEach((node, index) => {
    if (node.type !== "httpRequest") return;
    const parsed = tryParseJson(node.data.lastResponseJson ?? "");
    if (parsed === undefined) return;

    const label = node.data.url.trim()
      ? `HTTP ${node.data.method} · ${node.data.url.trim()}`
      : `HTTP Request ${index + 1}`;

    for (const field of flattenJsonPaths(parsed)) {
      sources.push({
        nodeId: node.id,
        nodeLabel: label,
        path: field.path,
        sample: field.sample,
      });
    }
  });

  return sources;
}
