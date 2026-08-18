import {
  APP_START_OWNER_ID,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import { listCustomMenuButtonGraphs } from "@/lib/editor/actions/custom-menu-buttons";
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
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";

export type FieldSourceKind = "http" | "postMessage";

export type HttpFieldSource = {
  kind: FieldSourceKind;
  nodeId: string;
  nodeLabel: string;
  path: string;
  sample: string;
  ownerId: number;
};

export type FieldSourceGroup = {
  id: string;
  kind: FieldSourceKind;
  label: string;
  items: HttpFieldSource[];
};

const KIND_LABEL: Record<FieldSourceKind, string> = {
  http: "HTTP Request",
  postMessage: "Post Message",
};

function collectFromGraph(
  graph: HotspotActionGraph,
  ownerId: number,
  nodeLabelPrefix: string,
  sources: HttpFieldSource[],
) {
  let httpIndex = 0;
  let postMessageIndex = 0;

  graph.nodes.forEach((node) => {
    if (node.type === "httpRequest") {
      const parsed = tryParseJson(node.data.lastResponseJson ?? "");
      if (parsed === undefined) return;

      httpIndex += 1;
      const label = `${nodeLabelPrefix} · ${KIND_LABEL.http} ${httpIndex}`;

      for (const field of flattenJsonPaths(parsed)) {
        sources.push({
          kind: "http",
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

      postMessageIndex += 1;
      const event = node.data.eventName.trim();
      const label = event
        ? `${nodeLabelPrefix} · ${KIND_LABEL.postMessage} ${postMessageIndex} · ${event}`
        : `${nodeLabelPrefix} · ${KIND_LABEL.postMessage} ${postMessageIndex}`;
      const parsed = tryParseJson(node.data.lastPayloadJson ?? "");

      for (const path of fields) {
        const live =
          parsed === undefined ? undefined : getValueByPath(parsed, path);
        sources.push({
          kind: "postMessage",
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
export function listAllFieldSources(excludeNodeId?: string): HttpFieldSource[] {
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

  for (const hotspot of useEditorStore.getState().hotspots) {
    collectFromGraph(getActionGraph(hotspot), hotspot.id, hotspot.title || "Hotspot", sources);
  }

  for (const entry of listCustomMenuButtonGraphs()) {
    collectFromGraph(entry.graph, entry.ownerId, entry.label, sources);
  }

  return excludeNodeId
    ? sources.filter((source) => source.nodeId !== excludeNodeId)
    : sources;
}

export function listHttpFieldSources(hotspot: Hotspot): HttpFieldSource[] {
  return listAllFieldSources().filter((source) => {
    // Keep hotspot-local sources plus start-graph sources (same as before).
    return (
      source.ownerId === hotspot.id ||
      source.ownerId === APP_START_OWNER_ID ||
      source.ownerId === SCENE_START_OWNER_ID
    );
  });
}

/** Group field sources per source node (HTTP Request 1, HTTP Request 2, …). */
export function groupHttpFieldSources(
  sources: HttpFieldSource[],
): FieldSourceGroup[] {
  const order: string[] = [];
  const byNode = new Map<string, HttpFieldSource[]>();

  for (const source of sources) {
    const existing = byNode.get(source.nodeId);
    if (!existing) {
      byNode.set(source.nodeId, [source]);
      order.push(source.nodeId);
    } else {
      existing.push(source);
    }
  }

  let httpIndex = 0;
  let postMessageIndex = 0;

  return order.map((nodeId) => {
    const items = byNode.get(nodeId) ?? [];
    const kind = items[0]?.kind ?? "http";
    const index = kind === "http" ? ++httpIndex : ++postMessageIndex;
    return {
      id: nodeId,
      kind,
      label: `${KIND_LABEL[kind]} ${index}`,
      items,
    };
  });
}

/** Build field sources from a single tested HTTP response JSON. */
export function fieldSourcesFromResponseJson(
  responseJson: string,
  meta: Pick<HttpFieldSource, "nodeId" | "ownerId" | "nodeLabel">,
): HttpFieldSource[] {
  const parsed = tryParseJson(responseJson);
  if (parsed === undefined) return [];
  return flattenJsonPaths(parsed).map((field) => ({
    kind: "http" as const,
    nodeId: meta.nodeId,
    nodeLabel: meta.nodeLabel,
    path: field.path,
    sample: field.sample,
    ownerId: meta.ownerId,
  }));
}
