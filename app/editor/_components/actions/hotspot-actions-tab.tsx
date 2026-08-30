"use client";

import { Workflow } from "lucide-react";
import { ACTION_UI_REGISTRY } from "@/app/editor/_components/actions/action-node-registry";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import { chainFromTrigger } from "@/lib/editor/actions/graph-ops";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { ActionNode, HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import {
  normalizeReceiveEvents,
  TRIGGER_NODE_ID,
} from "@/lib/editor/types/hotspot-action";
import type { Scene } from "@/lib/editor/types/scene";

type HotspotActionsTabProps = {
  selected: Hotspot;
};

function actionNodeDetail(
  node: ActionNode,
  graph: HotspotActionGraph,
  scenes: Scene[],
): string | null {
  switch (node.type) {
    case "openModal": {
      const hasOnOpen = graph.edges.some(
        (edge) =>
          edge.source === node.id &&
          (edge.sourceHandle === "onOpen" ||
            edge.sourceHandle == null ||
            edge.sourceHandle === ""),
      );
      const hasOnClose = graph.edges.some(
        (edge) =>
          edge.source === node.id && edge.sourceHandle === "onClose",
      );
      if (hasOnOpen && hasOnClose) return "→ onOpen + onClose";
      if (hasOnOpen) return "→ onOpen";
      if (hasOnClose) return "→ onClose";
      return null;
    }
    case "goToScene":
      return node.data.sceneId
        ? `→ ${scenes.find((s) => s.id === node.data.sceneId)?.name ?? "missing scene"}`
        : "→ (no scene)";
    case "goToHotspot":
      return node.data.hotspotRef.trim()
        ? `→ ${node.data.offset === "next" ? "next of " : node.data.offset === "prev" ? "prev of " : ""}${
            node.data.hotspotRef
          }${node.data.runTargetActions ? " + actions" : ""}`
        : "→ (no hotspot)";
    case "openUrl":
      return node.data.url.trim()
        ? `→ ${node.data.url.trim()}`
        : "→ (no url)";
    case "sendPostMessage": {
      const receive = (node.data.mode ?? "send") === "receive";
      if (!receive) {
        return node.data.eventName.trim()
          ? `→ send ${node.data.eventName.trim()}`
          : "→ send (no event)";
      }
      const events = normalizeReceiveEvents(node.data);
      const names = events
        .map((event) => event.eventName.trim())
        .filter(Boolean);
      if (names.length === 0) return "→ recv (no event)";
      if (names.length === 1) return `→ recv ${names[0]}`;
      return `→ recv ${names.length} events`;
    }
    case "httpRequest":
      return node.data.url.trim()
        ? `→ ${node.data.method} ${node.data.url.trim()}`
        : `→ ${node.data.method} (no url)`;
    case "enableDisable": {
      const count =
        (node.data.disabledHotspotIds?.length ?? 0) +
        (node.data.disabledLayerIds?.length ?? 0);
      return count > 0 ? `→ ${count} disabled` : "→ all enabled";
    }
    case "enableDisableMesh": {
      const count = node.data.disabledMeshIds?.length ?? 0;
      return count > 0 ? `→ ${count} hidden` : "→ all meshes shown";
    }
    case "highlightMesh": {
      const count = node.data.meshIds?.length ?? 0;
      if (count === 0) return "→ (no meshes)";
      const tint = node.data.tintEnabled !== false;
      const stroke = Boolean(node.data.strokeEnabled);
      if (tint && stroke) return `→ ${count} tint + stroke`;
      if (tint) return `→ ${count} tint`;
      if (stroke) return `→ ${count} stroke`;
      return `→ ${count} (off)`;
    }
    case "changeHotspotColor":
      return (node.data.hotspotIds?.length ?? 0) > 0
        ? node.data.color.trim()
          ? `→ ${node.data.hotspotIds.length} recolor`
          : `→ ${node.data.hotspotIds.length} reset color`
        : "→ (no hotspots)";
    case "changeHotspotIcon":
      return (node.data.hotspotIds?.length ?? 0) > 0
        ? node.data.icon.trim()
          ? `→ ${node.data.hotspotIds.length} icon`
          : `→ ${node.data.hotspotIds.length} reset icon`
        : "→ (no hotspots)";
    case "changeHotspotNumberTitle": {
      const count = node.data.items?.length ?? 0;
      if (count === 0) return "→ (no hotspots)";
      const resets = node.data.items.filter(
        (item) => !item.title.trim() && !item.number.trim(),
      ).length;
      if (resets === count) return `→ ${count} reset label`;
      return `→ ${count} label`;
    }
    case "forEach": {
      const raw = node.data.itemsPath.trim();
      if (!raw) return "→ response";
      return `→ ${raw}`;
    }
    case "spawnHotspots":
      return `→ ${node.data.coordMode}`;
    case "switch": {
      const count = node.data.cases.length;
      const field = node.data.subject.trim() || "(no field)";
      return `→ ${field} · ${count} case${count === 1 ? "" : "s"}`;
    }
    default:
      return null;
  }
}

function ActionNodeRow({
  node,
  index,
  graph,
  scenes,
}: {
  node: ActionNode;
  index: number | string;
  graph: HotspotActionGraph;
  scenes: Scene[];
}) {
  const ui = ACTION_UI_REGISTRY[node.type];
  const Icon = ui.icon;
  const detail = actionNodeDetail(node, graph, scenes);

  return (
    <li className="flex items-center gap-2 text-[12px] font-medium">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md text-[10px]"
        style={{
          background: "rgba(230,57,70,0.12)",
          color: "var(--editor-active-text)",
          border: "1px solid rgba(230,57,70,0.3)",
        }}
      >
        {index}
      </span>
      <Icon className="h-3.5 w-3.5" style={{ color: ui.accent }} />
      <span>{ui.meta.label}</span>
      {detail ? (
        <span
          className="truncate text-[10px] font-normal"
          style={{ color: "var(--editor-muted)" }}
        >
          {detail}
        </span>
      ) : null}
    </li>
  );
}

export function HotspotActionsTab({ selected }: HotspotActionsTabProps) {
  const openActionsModal = useUIStore((s) => s.openActionsModal);
  const scenes = useScenesStore((s) => s.scenes);
  const graph = getActionGraph(selected);
  const chain = chainFromTrigger(graph);
  const chainedIds = new Set(chain.map((node) => node.id));
  const extras = graph.nodes.filter(
    (node) => node.id !== TRIGGER_NODE_ID && !chainedIds.has(node.id),
  );

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div
        className="rounded-lg px-4 py-4"
        style={{
          border: "1px solid var(--editor-line-soft)",
          background: "rgba(11,20,36,0.35)",
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Workflow
            className="h-3.5 w-3.5"
            style={{ color: "var(--editor-crimson-2)" }}
          />
          <div className="text-[12px] font-semibold">Action chain</div>
        </div>

        {chain.length === 0 && extras.length === 0 ? (
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            No actions yet. Open the editor to add nodes for this hotspot.
          </div>
        ) : (
          <ol className="space-y-2">
            <li
              className="flex items-center gap-2 text-[11px]"
              style={{ color: "var(--editor-muted)" }}
            >
              <span className="editor-chip">Start</span>
              Hotspot clicked
            </li>
            {chain.length === 0 ? (
              <li className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
                Nothing is connected from this trigger yet.
              </li>
            ) : (
              chain.map((node, index) => (
                <ActionNodeRow
                  key={node.id}
                  node={node}
                  index={index + 1}
                  graph={graph}
                  scenes={scenes}
                />
              ))
            )}
            {extras.length > 0 ? (
              <>
                <li
                  className="pt-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--editor-muted-2)" }}
                >
                  Other nodes
                </li>
                {extras.map((node) => (
                  <ActionNodeRow
                    key={node.id}
                    node={node}
                    index="·"
                    graph={graph}
                    scenes={scenes}
                  />
                ))}
              </>
            ) : null}
          </ol>
        )}
      </div>

      <EditorButton
        variant="primary"
        className="w-full justify-center"
        onClick={() =>
          openActionsModal({ kind: "hotspot", hotspotId: selected.id })
        }
      >
        <Workflow className="h-3.5 w-3.5" />
        Open Actions Editor
      </EditorButton>

      <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
        The canvas stays in the editor. Use the button above to add or connect
        nodes.
      </div>
    </div>
  );
}
