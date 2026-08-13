import {
  APP_START_OWNER_ID,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import {
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import {
  flattenJsonPaths,
  formatResolvedFieldValue,
  getValueByPath,
  tryParseJson,
} from "@/lib/editor/blocks/json-paths";
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
    if (node.type === "httpRequest") {
      const parsed = tryParseJson(node.data.lastResponseJson ?? "");
      if (parsed === undefined) return;

      const label = node.data.url.trim()
        ? `${nodeLabelPrefix} · ${node.data.method} ${node.data.url.trim()}`
        : `${nodeLabelPrefix} HTTP ${index + 1}`;

      for (const field of flattenJsonPaths(parsed)) {
        sources.push({
          nodeId: node.id,
          nodeLabel: label,
          path: field.path,
          sample: field.sample,
          ownerId,
        });
      }
      return;
    }

    if (
      node.type === "sendPostMessage" &&
      (node.data.mode ?? "send") === "receive"
    ) {
      const fields = (node.data.payloadFields ?? [])
        .map((field) => field.trim())
        .filter(Boolean);
      if (fields.length === 0) return;

      const event = node.data.eventName.trim() || `event ${index + 1}`;
      const label = `${nodeLabelPrefix} · msg:${event}`;
      const parsed = tryParseJson(node.data.lastPayloadJson ?? "");

      for (const path of fields) {
        const live =
          parsed === undefined ? undefined : getValueByPath(parsed, path);
        sources.push({
          nodeId: node.id,
          nodeLabel: label,
          path,
          sample:
            live === undefined ? path : formatResolvedFieldValue(live),
          ownerId,
        });
      }
    }
  });
}

/**
 * Collect selectable JSON field paths from tested HTTP responses and
 * declared Post Message receive fields.
 */
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

  collectFromGraph(getActionGraph(hotspot), hotspot.id, "Hotspot", sources);
  return sources;
}
