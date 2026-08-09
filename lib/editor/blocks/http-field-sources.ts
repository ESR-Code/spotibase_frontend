import {
  APP_START_OWNER_ID,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import {
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { flattenJsonPaths, tryParseJson } from "@/lib/editor/blocks/json-paths";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";

export type HttpFieldSource = {
  nodeId: string;
  nodeLabel: string;
  path: string;
  sample: string;
  ownerId: number;
};

function collectFromGraph(
  graph: HotspotActionGraph,
  ownerId: number,
  nodeLabelPrefix: string,
  sources: HttpFieldSource[],
) {
  graph.nodes.forEach((node, index) => {
    if (node.type !== "httpRequest") return;
    const parsed = tryParseJson(node.data.lastResponseJson ?? "");
    if (parsed === undefined) return;

    const label = node.data.url.trim()
      ? `${nodeLabelPrefix} · ${node.data.method} ${node.data.url.trim()}`
      : `${nodeLabelPrefix} ${index + 1}`;

    for (const field of flattenJsonPaths(parsed)) {
      sources.push({
        nodeId: node.id,
        nodeLabel: label,
        path: field.path,
        sample: field.sample,
        ownerId,
      });
    }
  });
}

/** Collect selectable JSON field paths from tested HTTP Request nodes. */
export function listHttpFieldSources(hotspot: Hotspot): HttpFieldSource[] {
  const sources: HttpFieldSource[] = [];
  const scenes = useScenesStore.getState();

  collectFromGraph(
    scenes.appStartActions ?? createEmptyActionGraph(),
    APP_START_OWNER_ID,
    "App Start",
    sources,
  );

  const scene =
    scenes.scenes.find((s) => s.id === scenes.activeSceneId) ?? scenes.scenes[0];
  if (scene) {
    collectFromGraph(
      scene.startActions ?? createEmptyActionGraph(),
      SCENE_START_OWNER_ID,
      "Scene Start",
      sources,
    );
  }

  collectFromGraph(getActionGraph(hotspot), hotspot.id, "HTTP", sources);
  return sources;
}
