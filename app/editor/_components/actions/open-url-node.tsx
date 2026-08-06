"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ExternalLink } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { normalizeExternalUrl } from "@/lib/editor/utils/open-external-url";

export type OpenUrlFlowNode = Node<ActionFlowNodeData, "openUrl">;

export function OpenUrlNode({ data, selected }: NodeProps<OpenUrlFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;

  // Read live from the store so typing updates don't depend on remounting
  // React Flow nodes (which would steal input focus).
  const url = useEditorStore((s) => {
    if (!actionNodeId) return "";
    const hotspot = s.hotspots.find((h) => h.id === data.hotspotId);
    if (!hotspot) return "";
    const node = getActionGraph(hotspot).nodes.find((n) => n.id === actionNodeId);
    return node?.type === "openUrl" ? node.data.url : "";
  });

  if (!actionNodeId) return null;

  const warning = !url.trim()
    ? "Enter a URL"
    : !normalizeExternalUrl(url)
      ? "Enter a valid URL"
      : null;

  return (
    <ActionNodeCard
      label="Open URL"
      icon={ExternalLink}
      accent="var(--editor-teal)"
      selected={selected}
      onDelete={() => deleteNode(data.hotspotId, actionNodeId)}
      footer={
        warning ? (
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--editor-amber)" }}
          >
            {warning}
          </div>
        ) : null
      }
    >
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          URL
        </span>
        <input
          className="editor-input"
          type="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => {
            e.stopPropagation();
            updateNodeData(data.hotspotId, actionNodeId, {
              url: e.target.value,
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
    </ActionNodeCard>
  );
}
