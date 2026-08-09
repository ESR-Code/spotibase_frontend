"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Radio } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import {
  APP_START_OWNER_ID,
  isHotspotOwnerId,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { parsePayloadJson } from "@/lib/editor/actions/send-post-message";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import {
  POST_MESSAGE_TARGETS,
  type PostMessageTarget,
  type SendPostMessageActionNode,
} from "@/lib/editor/types/hotspot-action";

export type SendPostMessageFlowNode = Node<
  ActionFlowNodeData,
  "sendPostMessage"
>;

const EMPTY_DATA: SendPostMessageActionNode["data"] = {
  eventName: "",
  payloadJson: "{\n  \n}",
  targetOrigin: "*",
  target: "parent",
};

export function SendPostMessageNode({
  data,
  selected,
}: NodeProps<SendPostMessageFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;

  const hotspotLive = useEditorStore(
    useShallow((s) => {
      if (!actionNodeId || !isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const hotspot = s.hotspots.find((h) => h.id === ownerId);
      const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "sendPostMessage") return EMPTY_DATA;
      return {
        eventName: node.data.eventName,
        payloadJson: node.data.payloadJson,
        targetOrigin: node.data.targetOrigin,
        target: node.data.target,
      };
    }),
  );

  const startLive = useScenesStore(
    useShallow((s) => {
      if (!actionNodeId || isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const graph =
        ownerId === APP_START_OWNER_ID
          ? s.appStartActions
          : (s.scenes.find((sc) => sc.id === s.activeSceneId)?.startActions ??
            null);
      const node = graph?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "sendPostMessage") return EMPTY_DATA;
      return {
        eventName: node.data.eventName,
        payloadJson: node.data.payloadJson,
        targetOrigin: node.data.targetOrigin,
        target: node.data.target,
      };
    }),
  );

  const live = isHotspotOwnerId(ownerId) ? hotspotLive : startLive;

  if (!actionNodeId) return null;

  const payloadCheck = parsePayloadJson(live.payloadJson);
  const warning = !live.eventName.trim()
    ? "Enter an event name"
    : !payloadCheck.ok
      ? payloadCheck.error
      : !live.targetOrigin.trim()
        ? "Enter a target origin"
        : null;

  const patch = (partial: Partial<SendPostMessageActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const stop = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  };

  return (
    <ActionNodeCard
      label="Send Post Message"
      icon={Radio}
      accent="#7aa2ff"
      selected={selected}
      wide
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        warning ? (
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--editor-amber)" }}
          >
            {warning}
          </div>
        ) : (
          <div className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
            Sends {"{ source, event, data, hotspotId }"}
          </div>
        )
      }
    >
      <div className="space-y-2.5">
        <label className="block">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Event name
          </span>
          <input
            className="editor-input"
            placeholder="e.g. hotspot:clicked"
            value={live.eventName}
            onChange={(e) => patch({ eventName: e.target.value })}
            {...stop}
          />
        </label>

        <label className="block">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Event object (JSON)
          </span>
          <textarea
            className="editor-textarea editor-textarea-compact"
            rows={4}
            spellCheck={false}
            placeholder='{ "key": "value" }'
            value={live.payloadJson}
            onChange={(e) => patch({ payloadJson: e.target.value })}
            {...stop}
          />
        </label>

        <label className="block">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Target window
          </span>
          <select
            className="editor-select"
            value={live.target}
            onChange={(e) =>
              patch({ target: e.target.value as PostMessageTarget })
            }
            {...stop}
          >
            {POST_MESSAGE_TARGETS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Target origin
          </span>
          <input
            className="editor-input"
            placeholder="* or https://example.com"
            value={live.targetOrigin}
            onChange={(e) => patch({ targetOrigin: e.target.value })}
            {...stop}
          />
        </label>
      </div>
    </ActionNodeCard>
  );
}
