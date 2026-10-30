"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { PanelRightOpen, PencilLine } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import {
  isHotspotOwnerId,
  SPAWN_CLICK_LANE_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import {
  addSceneDialog,
  useActiveSceneDialogs,
} from "@/lib/editor/dialogs/scene-dialogs";
import { selectDialogExclusive } from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  OPEN_MODAL_HANDLE_ON_CLOSE,
  OPEN_MODAL_HANDLE_ON_OPEN,
} from "@/lib/editor/types/hotspot-action";

export type OpenModalFlowNode = Node<ActionFlowNodeData, "openModal">;

const NEW_DIALOG_VALUE = "__new__";

export function OpenModalNode({
  data,
  selected,
}: NodeProps<OpenModalFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const ownerId = data.hotspotId;
  const actionNodeId = data.actionNode?.id;
  const node = useOwnedActionNode(ownerId, actionNodeId);
  const dialogs = useActiveSceneDialogs();
  const hotspot = useEditorStore((s) =>
    s.hotspots.find((h) => h.id === ownerId),
  );
  if (!actionNodeId) return null;

  // Hotspot clicks (and spawned pins) can show their own content.
  const canUseHotspot =
    isHotspotOwnerId(ownerId) || ownerId === SPAWN_CLICK_LANE_OWNER_ID;
  const dialogId =
    node?.type === "openModal" ? (node.data.dialogId ?? "") : "";
  const dialog = dialogId
    ? (dialogs.find((item) => item.id === dialogId) ?? null)
    : null;

  const warning = dialogId
    ? dialog
      ? null
      : "Dialog no longer exists"
    : canUseHotspot
      ? null
      : "Pick a dialog to open";

  const blockCount = dialogId
    ? (dialog?.blocks.length ?? 0)
    : (hotspot?.blocks.length ?? 0);
  const summary = dialogId
    ? dialog
      ? blockCount === 0
        ? "Dialog has no content blocks yet."
        : `Opens “${dialog.title.trim() || "Dialog"}” (${blockCount} block${blockCount === 1 ? "" : "s"}).`
      : null
    : canUseHotspot
      ? ownerId === SPAWN_CLICK_LANE_OWNER_ID
        ? "Opens the spawned hotspot's dialog."
        : blockCount === 0
          ? "Hotspot has no content blocks yet."
          : `Opens marker dialog (${blockCount} block${blockCount === 1 ? "" : "s"}).`
      : null;

  const setDialogId = (next: string) =>
    updateNodeData(ownerId, actionNodeId, {
      dialogId: next || undefined,
    });

  const editDialog = (id: string) => {
    useUIStore.getState().closeActionsModal();
    useUIStore.getState().setOutlinerTab("dialogs");
    useUIStore.getState().setOutlinerCollapsed(false);
    selectDialogExclusive(id);
  };

  return (
    <ActionNodeCard
      label="Open Modal"
      icon={PanelRightOpen}
      accent="var(--editor-crimson-2)"
      selected={selected}
      showSource={false}
      onDelete={() => deleteNode(ownerId, actionNodeId)}
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
          Content
        </span>
        <div className="flex items-center gap-1.5">
          <select
            className="editor-select min-w-0 flex-1"
            value={dialogId}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.value === NEW_DIALOG_VALUE) {
                setDialogId(addSceneDialog().id);
                return;
              }
              setDialogId(e.target.value);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {canUseHotspot ? (
              <option value="">This hotspot</option>
            ) : (
              <option value="">Select dialog…</option>
            )}
            {dialogId && !dialog ? (
              <option value={dialogId}>(missing dialog)</option>
            ) : null}
            {dialogs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title.trim() || "Untitled dialog"}
              </option>
            ))}
            <option value={NEW_DIALOG_VALUE}>+ New dialog</option>
          </select>
          {dialog ? (
            <button
              type="button"
              className="editor-btn editor-btn-ghost nodrag"
              style={{ padding: "4px 6px" }}
              title="Edit dialog content"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                editDialog(dialog.id);
              }}
            >
              <PencilLine className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </label>

      {summary ? (
        <div className="mt-2 text-[11px]" style={{ color: "var(--editor-muted)" }}>
          {summary}
        </div>
      ) : null}

      <div className="editor-action-event-handles" aria-hidden>
        <div className="editor-action-event-handle-row">
          <span className="editor-action-event-handle-label">onOpen</span>
          <Handle
            id={OPEN_MODAL_HANDLE_ON_OPEN}
            type="source"
            position={Position.Right}
            className="editor-action-handle editor-action-handle-event"
          />
        </div>
        <div className="editor-action-event-handle-row">
          <span className="editor-action-event-handle-label">onClose</span>
          <Handle
            id={OPEN_MODAL_HANDLE_ON_CLOSE}
            type="source"
            position={Position.Right}
            className="editor-action-handle editor-action-handle-event"
          />
        </div>
      </div>
    </ActionNodeCard>
  );
}
