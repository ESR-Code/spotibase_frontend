import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import { chainFromTrigger } from "@/lib/editor/actions/graph-ops";
import { ACTION_NODE_META } from "@/lib/editor/actions/registry";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { toast } from "sonner";

/**
 * Walk the hotspot action chain and run each node's registered handler.
 * Stops early if a node fails validation or returns `"stop"`.
 */
export function runHotspotActions(hotspotId: number) {
  const editor = useEditorStore.getState();
  const hotspot = editor.hotspots.find((h) => h.id === hotspotId);
  if (!hotspot) return;

  const graph = getActionGraph(hotspot);
  const chain = chainFromTrigger(graph);
  const visited = new Set<string>();
  const ctx = { hotspotId };

  for (const node of chain) {
    if (visited.has(node.id)) break;
    visited.add(node.id);

    const meta = ACTION_NODE_META[node.type];
    const error = meta.validate(node);
    if (error) {
      toast.error(`${meta.label}: ${error}`);
      break;
    }

    const result = meta.run(node, ctx);
    if (result === "stop") break;
  }
}
