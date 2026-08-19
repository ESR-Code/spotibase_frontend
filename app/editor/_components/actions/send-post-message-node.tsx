"use client";

import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ChevronDown, MessagesSquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
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
  createEmptyPostMessageReceiveEvent,
  normalizeReceiveEvents,
  POST_MESSAGE_MODES,
  POST_MESSAGE_TARGETS,
  postMessageReceiveHandleId,
  type PostMessageMode,
  type PostMessageReceiveEvent,
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
  receiveEvents: [],
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

function placeholderRows(event: PostMessageReceiveEvent): FieldRow[] {
  if (event.payloadFields.length === 0) {
    return [{ id: `${event.id}::empty`, path: "" }];
  }
  return event.payloadFields.map((path, index) => ({
    id: `${event.id}::${index}`,
    path,
  }));
}

function rowsToFields(rows: FieldRow[]): string[] {
  return rows.map((row) => row.path.trim()).filter(Boolean);
}

function eventTitle(
  event: PostMessageReceiveEvent,
  index: number,
): string {
  const name = event.eventName.trim();
  return name || `Event ${index + 1}`;
}

export function SendPostMessageNode({
  id,
  data,
  selected,
}: NodeProps<SendPostMessageFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const updateNodeInternals = useUpdateNodeInternals();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const allowReceive = isStartOwnerId(ownerId);
  const [fieldRowsByEvent, setFieldRowsByEvent] = useState<
    Record<string, FieldRow[]>
  >({});
  const [openByEvent, setOpenByEvent] = useState<Record<string, boolean>>({});
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const eventNameRef = useRef<HTMLInputElement>(null);
  const payloadRef = useRef<HTMLTextAreaElement>(null);

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
          receiveEvents: ownedNode.data.receiveEvents ?? [],
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
  const receiveEvents =
    mode === "receive"
      ? normalizeReceiveEvents({ ...live, mode: "receive" })
      : [];
  const receiveLayoutKey = receiveEvents
    .map((event) => {
      const open = openByEvent[event.id] ?? receiveEvents.length === 1;
      const rowCount = (
        fieldRowsByEvent[event.id] ?? event.payloadFields
      ).length;
      return `${event.id}:${event.eventName}:${rowCount}:${open ? "1" : "0"}`;
    })
    .join("|");

  const receiveEventIdsKey = receiveEvents.map((event) => event.id).join("|");

  useEffect(() => {
    updateNodeInternals(id);
  }, [
    id,
    mode,
    payloadOpen,
    targetOpen,
    receiveLayoutKey,
    receiveEventIdsKey,
    updateNodeInternals,
  ]);

  if (!actionNodeId) return null;

  const payloadCheck = parsePayloadJson(
    substituteTokensForValidation(live.payloadJson, "null"),
  );
  const declaredFieldCount = receiveEvents.reduce((sum, event) => {
    const rows = fieldRowsByEvent[event.id] ?? placeholderRows(event);
    return sum + rowsToFields(rows).length;
  }, 0);
  const namedEventCount = receiveEvents.filter((event) =>
    event.eventName.trim(),
  ).length;
  const warning =
    mode === "receive"
      ? namedEventCount === 0
        ? "Enter an event name"
        : !allowReceive && live.mode === "receive"
          ? "Receive is only available on App Start / Scene Start"
          : null
      : !live.eventName.trim()
        ? "Enter an event name"
        : !payloadCheck.ok
          ? payloadCheck.error
          : !live.targetOrigin.trim()
            ? "Enter a target origin"
            : null;

  const patch = (partial: Partial<SendPostMessageActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const commitReceiveEvents = (events: PostMessageReceiveEvent[]) => {
    patch({ receiveEvents: events });
  };

  const updateReceiveEvent = (
    eventId: string,
    partial: Partial<PostMessageReceiveEvent>,
  ) => {
    commitReceiveEvents(
      receiveEvents.map((event) =>
        event.id === eventId ? { ...event, ...partial } : event,
      ),
    );
  };

  const commitEventFieldRows = (eventId: string, rows: FieldRow[]) => {
    setFieldRowsByEvent((prev) => ({ ...prev, [eventId]: rows }));
    updateReceiveEvent(eventId, { payloadFields: rowsToFields(rows) });
  };

  const addReceiveEvent = () => {
    const created = createEmptyPostMessageReceiveEvent();
    commitReceiveEvents([...receiveEvents, created]);
    setFieldRowsByEvent((prev) => ({
      ...prev,
      [created.id]: [createEmptyFieldRow()],
    }));
    setOpenByEvent(() => {
      const next: Record<string, boolean> = {};
      for (const event of receiveEvents) next[event.id] = false;
      next[created.id] = true;
      return next;
    });
  };

  const removeReceiveEvent = (eventId: string) => {
    if (receiveEvents.length <= 1) return;
    commitReceiveEvents(receiveEvents.filter((event) => event.id !== eventId));
    setFieldRowsByEvent((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setOpenByEvent((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  };

  const toggleEventOpen = (eventId: string) => {
    setOpenByEvent((prev) => {
      const current = prev[eventId] ?? receiveEvents.length === 1;
      return { ...prev, [eventId]: !current };
    });
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
      showSource={mode !== "receive"}
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

        {mode === "send" ? (
          <>
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
                  placeholder="e.g. hotspot:clicked"
                  value={live.eventName}
                  onChange={(e) => patch({ eventName: e.target.value })}
                  {...stop}
                />
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
              </div>
            </label>

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

            <div className="editor-http-headers">
              <button
                type="button"
                className="editor-http-headers-toggle"
                aria-expanded={targetOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetOpen((v) => !v);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span>
                  Target
                  {!targetOpen ? (
                    <span
                      className="ml-1.5 normal-case tracking-normal"
                      style={{ color: "var(--editor-muted)" }}
                    >
                      (
                      {POST_MESSAGE_TARGETS.find(
                        (item) => item.value === live.target,
                      )?.label ?? live.target}
                      {", "}
                      {live.targetOrigin.trim() || "*"}
                      )
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${targetOpen ? "rotate-180" : ""}`}
                />
              </button>
              {targetOpen ? (
                <div className="mt-1.5 space-y-2.5">
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
                      className={fieldClass}
                      placeholder="* or https://example.com"
                      value={live.targetOrigin}
                      onChange={(e) => patch({ targetOrigin: e.target.value })}
                      {...stop}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="editor-action-event-handles editor-pm-events">
              {receiveEvents.map((event, index) => {
                const open =
                  openByEvent[event.id] ?? receiveEvents.length === 1;
                const rows =
                  fieldRowsByEvent[event.id] ??
                  placeholderRows(event);
                return (
                  <div key={event.id} className="editor-pm-event">
                    <div className="editor-pm-event-header editor-action-event-handle-row">
                      <button
                        type="button"
                        className="editor-http-headers-toggle editor-pm-event-toggle"
                        aria-expanded={open}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEventOpen(event.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <span className="editor-pm-event-title">
                          {eventTitle(event, index)}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      {receiveEvents.length > 1 ? (
                        <IconButton
                          title="Remove event"
                          style={{ width: 24, height: 24 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeReceiveEvent(event.id);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3 w-3" />
                        </IconButton>
                      ) : null}
                      <Handle
                        id={postMessageReceiveHandleId(event.id)}
                        type="source"
                        position={Position.Right}
                        className="editor-action-handle editor-action-handle-event"
                      />
                    </div>
                    {open ? (
                      <div className="editor-pm-event-body space-y-2">
                        <label className="block">
                          <span
                            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--editor-muted-2)" }}
                          >
                            Event name
                          </span>
                          <input
                            className={fieldClass}
                            placeholder="e.g. app:ready"
                            value={event.eventName}
                            onChange={(e) =>
                              updateReceiveEvent(event.id, {
                                eventName: e.target.value,
                              })
                            }
                            {...stop}
                          />
                        </label>
                        <div className="space-y-1.5">
                          <span
                            className="block text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--editor-muted-2)" }}
                          >
                            Payload fields
                          </span>
                          {rows.map((row) => (
                            <div key={row.id} className="editor-pm-field-row">
                              <input
                                className={fieldClass}
                                placeholder="Field key (e.g. user.name)"
                                value={row.path}
                                onChange={(e) =>
                                  commitEventFieldRows(
                                    event.id,
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, path: e.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                {...stop}
                              />
                              <IconButton
                                title="Remove field"
                                style={{ width: 28, height: 28 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = rows.filter(
                                    (item) => item.id !== row.id,
                                  );
                                  commitEventFieldRows(
                                    event.id,
                                    next.length > 0
                                      ? next
                                      : [createEmptyFieldRow()],
                                  );
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
                              commitEventFieldRows(event.id, [
                                ...rows,
                                createEmptyFieldRow(),
                              ]);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add field
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="editor-http-headers-add"
              onClick={(e) => {
                e.stopPropagation();
                addReceiveEvent();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add event
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
