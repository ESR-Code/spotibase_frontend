"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ChevronDown, MessagesSquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  findOwnedActionNode,
  isStartOwnerId,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { insertTextAt, substituteTokensForValidation } from "@/lib/editor/actions/interpolate-fields";
import { parsePayloadJson } from "@/lib/editor/actions/send-post-message";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { listAllFieldSources } from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import {
  POST_MESSAGE_MODES,
  POST_MESSAGE_TARGETS,
  type PostMessageMode,
  type PostMessageTarget,
  type SendPostMessageActionNode,
} from "@/lib/editor/types/hotspot-action";

export type SendPostMessageFlowNode = Node<
  ActionFlowNodeData,
  "sendPostMessage"
>;

type FieldRow = { id: string; path: string };

const EMPTY_DATA: SendPostMessageActionNode["data"] = {
  mode: "send",
  eventName: "",
  payloadJson: "{\n  \n}",
  targetOrigin: "*",
  target: "parent",
  payloadFields: [],
  lastPayloadJson: "",
};

function newFieldRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyFieldRow(): FieldRow {
  return { id: newFieldRowId(), path: "" };
}

function fieldsToRows(fields: string[]): FieldRow[] {
  if (fields.length === 0) return [createEmptyFieldRow()];
  return fields.map((path) => ({ id: newFieldRowId(), path }));
}

function rowsToFields(rows: FieldRow[]): string[] {
  return rows.map((row) => row.path.trim()).filter(Boolean);
}

export function SendPostMessageNode({
  data,
  selected,
}: NodeProps<SendPostMessageFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const allowReceive = isStartOwnerId(ownerId);
  const [fieldRows, setFieldRows] = useState<FieldRow[]>([createEmptyFieldRow()]);
  const [payloadOpen, setPayloadOpen] = useState(false);
  const eventNameRef = useRef<HTMLInputElement>(null);
  const payloadRef = useRef<HTMLTextAreaElement>(null);
  const originRef = useRef<HTMLInputElement>(null);

  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "sendPostMessage"
      ? {
          mode: ownedNode.data.mode ?? "send",
          eventName: ownedNode.data.eventName,
          payloadJson: ownedNode.data.payloadJson,
          targetOrigin: ownedNode.data.targetOrigin,
          target: ownedNode.data.target,
          payloadFields: ownedNode.data.payloadFields ?? [],
          lastPayloadJson: ownedNode.data.lastPayloadJson ?? "",
        }
      : EMPTY_DATA;
  const hotspots = useEditorStore((s) => s.hotspots);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const fieldSources = useMemo(
    () => listAllFieldSources(actionNodeId),
    [actionNodeId, appStartActions, hotspots, sceneStartActions, customMenuButtons],
  );
  const mode: PostMessageMode =
    allowReceive && live.mode === "receive" ? "receive" : "send";

  useEffect(() => {
    if (!actionNodeId) return;
    const graphLive = findOwnedActionNode(ownerId, actionNodeId);
    const fields =
      graphLive?.type === "sendPostMessage"
        ? (graphLive.data.payloadFields ?? [])
        : [];
    setFieldRows(fieldsToRows(fields));
  }, [actionNodeId, ownerId]);

  if (!actionNodeId) return null;

  const payloadCheck = parsePayloadJson(
    substituteTokensForValidation(live.payloadJson, "null"),
  );
  const declaredFieldCount = rowsToFields(fieldRows).length;
  const warning =
    !live.eventName.trim()
      ? "Enter an event name"
      : mode === "send" && !payloadCheck.ok
        ? payloadCheck.error
        : mode === "send" && !live.targetOrigin.trim()
          ? "Enter a target origin"
          : !allowReceive && live.mode === "receive"
            ? "Receive is only available on App Start / Scene Start"
            : null;

  const patch = (partial: Partial<SendPostMessageActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const commitFieldRows = (rows: FieldRow[]) => {
    setFieldRows(rows);
    patch({ payloadFields: rowsToFields(rows) });
  };

  const updateFieldRow = (id: string, path: string) => {
    commitFieldRows(
      fieldRows.map((row) => (row.id === id ? { ...row, path } : row)),
    );
  };

  const addFieldRow = () => {
    commitFieldRows([...fieldRows, createEmptyFieldRow()]);
  };

  const removeFieldRow = (id: string) => {
    const next = fieldRows.filter((row) => row.id !== id);
    commitFieldRows(next.length > 0 ? next : [createEmptyFieldRow()]);
  };

  const stop = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  };
  const fieldClass = "editor-input nodrag nopan nowheel";
  const areaClass = "editor-textarea editor-textarea-compact nodrag nopan nowheel";
  const selectClass = "editor-select nodrag nopan nowheel";

  const insertInto = (
    current: string,
    token: string,
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    if (!el) return insertTextAt(current, token, current.length);
    return insertTextAt(
      current,
      token,
      el.selectionStart ?? current.length,
      el.selectionEnd ?? current.length,
    );
  };

  return (
    <ActionNodeCard
      label="Post Message"
      icon={MessagesSquare}
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
        ) : mode === "receive" ? (
          <div
            className="text-[10px]"
            style={{
              color:
                declaredFieldCount > 0
                  ? "var(--editor-teal)"
                  : "var(--editor-muted)",
            }}
          >
            {declaredFieldCount > 0
              ? `${declaredFieldCount} field${declaredFieldCount === 1 ? "" : "s"} available in Text blocks`
              : "Add payload field keys to use in Text blocks"}
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
            Behavior
          </span>
          <select
            className={selectClass}
            value={mode}
            onChange={(e) => {
              const next = e.target.value as PostMessageMode;
              if (next === "receive" && !allowReceive) return;
              patch({ mode: next });
            }}
            {...stop}
          >
            {POST_MESSAGE_MODES.filter(
              (item) => item.value === "send" || allowReceive,
            ).map((item) => (
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
            Event name
          </span>
          <div className="editor-var-field">
            <input
              ref={eventNameRef}
              className={fieldClass}
              placeholder={
                mode === "receive" ? "e.g. app:ready" : "e.g. hotspot:clicked"
              }
              value={live.eventName}
              onChange={(e) => patch({ eventName: e.target.value })}
              {...stop}
            />
            {mode === "send" ? (
              <VariableInsertButton
                sources={fieldSources}
                onInsert={(token) =>
                  patch({
                    eventName: insertInto(
                      live.eventName,
                      token,
                      eventNameRef.current,
                    ),
                  })
                }
              />
            ) : null}
          </div>
        </label>

        {mode === "send" ? (
          <>
            <div className="editor-http-headers">
              <button
                type="button"
                className="editor-http-headers-toggle"
                aria-expanded={payloadOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setPayloadOpen((v) => !v);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span>Event object (JSON)</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${payloadOpen ? "rotate-180" : ""}`}
                />
              </button>
              {payloadOpen ? (
                <div className="mt-1.5 space-y-1">
                  <div className="editor-var-field editor-var-field-area">
                    <textarea
                      ref={payloadRef}
                      className={areaClass}
                      rows={4}
                      spellCheck={false}
                      placeholder='{ "userId": "{{userId}}" }'
                      value={live.payloadJson}
                      onChange={(e) => patch({ payloadJson: e.target.value })}
                      {...stop}
                    />
                    <VariableInsertButton
                      sources={fieldSources}
                      onInsert={(token) =>
                        patch({
                          payloadJson: insertInto(
                            live.payloadJson,
                            token,
                            payloadRef.current,
                          ),
                        })
                      }
                    />
                  </div>
                  {!payloadCheck.ok ? (
                    <span
                      className="block text-[10px]"
                      style={{ color: "var(--editor-amber)" }}
                    >
                      {payloadCheck.error}
                    </span>
                  ) : null}
                </div>
              ) : !payloadCheck.ok ? (
                <span
                  className="mt-1 block text-[10px]"
                  style={{ color: "var(--editor-amber)" }}
                >
                  {payloadCheck.error}
                </span>
              ) : null}
            </div>

            <label className="block">
              <span
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--editor-muted-2)" }}
              >
                Target window
              </span>
              <select
                className={selectClass}
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
                ref={originRef}
                className={fieldClass}
                placeholder="* or https://example.com"
                value={live.targetOrigin}
                onChange={(e) => patch({ targetOrigin: e.target.value })}
                {...stop}
              />
            </label>
          </>
        ) : (
          <div className="space-y-1.5">
            <span
              className="block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Payload fields
            </span>
            {fieldRows.map((row) => (
              <div key={row.id} className="editor-pm-field-row">
                <input
                  className={fieldClass}
                  placeholder="Field key (e.g. user.name)"
                  value={row.path}
                  onChange={(e) => updateFieldRow(row.id, e.target.value)}
                  {...stop}
                />
                <IconButton
                  title="Remove field"
                  style={{ width: 28, height: 28 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFieldRow(row.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
            <button
              type="button"
              className="editor-http-headers-add"
              onClick={(e) => {
                e.stopPropagation();
                addFieldRow();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add field
            </button>
            <div
              className="text-[10px] leading-relaxed"
              style={{ color: "var(--editor-muted)" }}
            >
              Nested paths supported (e.g. <code>user.address.city</code>,{" "}
              <code>items[0].id</code>). Values resolve from the received
              payload in Preview.
            </div>
          </div>
        )}
      </div>
    </ActionNodeCard>
  );
}
