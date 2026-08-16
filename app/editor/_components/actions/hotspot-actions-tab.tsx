"use client";

import { Workflow } from "lucide-react";
import { ACTION_UI_REGISTRY } from "@/app/editor/_components/actions/action-node-registry";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import { chainFromTrigger } from "@/lib/editor/actions/graph-ops";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";

type HotspotActionsTabProps = {
  selected: Hotspot;
};

export function HotspotActionsTab({ selected }: HotspotActionsTabProps) {
  const openActionsModal = useUIStore((s) => s.openActionsModal);
  const scenes = useScenesStore((s) => s.scenes);
  const hotspots = useEditorStore((s) => s.hotspots);
  const graph = getActionGraph(selected);
  const chain = chainFromTrigger(graph);

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

        {chain.length === 0 ? (
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            No actions connected. This hotspot will do nothing when clicked in
            preview.
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
            {chain.map((node, index) => {
              const ui = ACTION_UI_REGISTRY[node.type];
              const Icon = ui.icon;
              const detail =
                node.type === "goToScene"
                  ? node.data.sceneId
                    ? `→ ${
                        scenes.find((s) => s.id === node.data.sceneId)?.name ??
                        "missing scene"
                      }`
                    : "→ (no scene)"
                  : node.type === "goToHotspot"
                    ? node.data.hotspotId
                      ? `→ ${node.data.offset === "next" ? "next of " : node.data.offset === "prev" ? "prev of " : ""}${
                          hotspots.find((h) => h.id === node.data.hotspotId)
                            ?.title ?? `HSP-${String(node.data.hotspotId).padStart(3, "0")}`
                        }`
                      : "→ (no hotspot)"
                  : node.type === "openUrl"
                    ? node.data.url.trim()
                      ? `→ ${node.data.url.trim()}`
                      : "→ (no url)"
                    : node.type === "sendPostMessage"
                      ? node.data.eventName.trim()
                        ? `→ ${(node.data.mode ?? "send") === "receive" ? "recv" : "send"} ${node.data.eventName.trim()}`
                        : `→ ${(node.data.mode ?? "send") === "receive" ? "recv" : "send"} (no event)`
                      : node.type === "httpRequest"
                        ? node.data.url.trim()
                          ? `→ ${node.data.method} ${node.data.url.trim()}`
                          : `→ ${node.data.method} (no url)`
                        : node.type === "enableDisable"
                          ? (node.data.disabledHotspotIds?.length ?? 0) +
                              (node.data.disabledLayerIds?.length ?? 0) >
                            0
                            ? `→ ${(node.data.disabledHotspotIds?.length ?? 0) + (node.data.disabledLayerIds?.length ?? 0)} disabled`
                            : "→ all enabled"
                          : node.type === "changeHotspotColor"
                            ? (node.data.hotspotIds?.length ?? 0) > 0
                              ? node.data.color.trim()
                                ? `→ ${node.data.hotspotIds.length} recolor`
                                : `→ ${node.data.hotspotIds.length} reset color`
                              : "→ (no hotspots)"
                            : node.type === "changeHotspotIcon"
                              ? (node.data.hotspotIds?.length ?? 0) > 0
                                ? node.data.icon.trim()
                                  ? `→ ${node.data.hotspotIds.length} icon`
                                  : `→ ${node.data.hotspotIds.length} reset icon`
                                : "→ (no hotspots)"
                              : null;
              return (
                <li
                  key={node.id}
                  className="flex items-center gap-2 text-[12px] font-medium"
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-md text-[10px]"
                    style={{
                      background: "rgba(230,57,70,0.12)",
                      color: "var(--editor-active-text)",
                      border: "1px solid rgba(230,57,70,0.3)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: ui.accent }}
                  />
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
            })}
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
        Right-click the canvas to add nodes. Connect nodes left-to-right to
        build a sequence.
      </div>
    </div>
  );
}
