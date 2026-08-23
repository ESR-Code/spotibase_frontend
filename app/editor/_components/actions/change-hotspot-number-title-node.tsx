"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ChevronDown, Hash, Plus, RotateCcw, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { formatHotspotRef } from "@/lib/editor/actions/go-to-hotspot";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import {
  listAllFieldSources,
  type HttpFieldSource,
} from "@/lib/editor/blocks/http-field-sources";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  ChangeHotspotNumberTitleActionNode,
  ChangeHotspotNumberTitleItem,
} from "@/lib/editor/types/hotspot-action";

export type ChangeHotspotNumberTitleFlowNode = Node<
  ActionFlowNodeData,
  "changeHotspotNumberTitle"
>;

const EMPTY_DATA: ChangeHotspotNumberTitleActionNode["data"] = {
  items: [],
};

function authoredNumber(hotspot: Hotspot): string {
  return hotspot.number === "" || hotspot.number == null
    ? ""
    : String(hotspot.number);
}

function insertInto(
  current: string,
  token: string,
  el: HTMLInputElement | null,
): string {
  if (!el) return insertTextAt(current, token, current.length);
  return insertTextAt(
    current,
    token,
    el.selectionStart ?? current.length,
    el.selectionEnd ?? current.length,
  );
}

type ItemCardProps = {
  item: ChangeHotspotNumberTitleItem;
  hotspot: Hotspot | undefined;
  fieldSources: HttpFieldSource[];
  onChange: (patch: Pick<ChangeHotspotNumberTitleItem, "title" | "number">) => void;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onRemove: () => void;
};

function NumberTitleItemCard({
  item,
  hotspot,
  fieldSources,
  onChange,
  onOpenChange,
  onReset,
  onRemove,
}: ItemCardProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const open = item.open === true;
  const isReset = item.title.trim() === "" && item.number.trim() === "";
  const label = hotspot
    ? hotspot.title || `Hotspot ${hotspot.id}`
    : `Hotspot ${item.hotspotId}`;

  return (
    <div
      className="nodrag nopan nowheel rounded-lg border"
      style={{
        borderColor: "var(--editor-line-soft)",
        background: "rgba(11, 20, 36, 0.35)",
      }}
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          className="editor-http-headers-toggle editor-pm-event-toggle min-w-0 flex-1"
          aria-expanded={open}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(!open);
          }}
        >
          <span className="min-w-0 flex-1 text-left">
            <span
              className="block truncate text-[11px] font-semibold"
              style={{ color: "var(--editor-fg)" }}
            >
              {label}
            </span>
            <span
              className="block truncate text-[9px] font-medium uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              {formatHotspotRef(item.hotspotId)}
              {hotspot ? "" : " · missing"}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          className="editor-enable-disable-group-all inline-flex items-center gap-1"
          title="Restore original title and number when this node runs"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
        <IconButton
          title="Remove hotspot"
          style={{ width: 24, height: 24 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </IconButton>
      </div>

      {open ? (
        <div
          className="space-y-2 border-t px-2 pb-2 pt-2"
          style={{ borderColor: "var(--editor-line-soft)" }}
        >
          <label className="block">
            <span
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Title
            </span>
            <div className="editor-var-field">
              <input
                ref={titleRef}
                className="editor-input nodrag nopan nowheel"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={hotspot?.title || "Original title"}
                value={item.title}
                onChange={(e) =>
                  onChange({ title: e.target.value, number: item.number })
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <VariableInsertButton
                sources={fieldSources}
                onInsert={(token) => {
                  const next = insertInto(item.title, token, titleRef.current);
                  onChange({ title: next, number: item.number });
                  requestAnimationFrame(() => titleRef.current?.focus());
                }}
              />
            </div>
          </label>

          <label className="block">
            <span
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Hotspot number
            </span>
            <div className="editor-var-field">
              <input
                ref={numberRef}
                className="editor-input nodrag nopan nowheel"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  hotspot
                    ? authoredNumber(hotspot) || "Original number"
                    : "Number"
                }
                value={item.number}
                onChange={(e) =>
                  onChange({ title: item.title, number: e.target.value })
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <VariableInsertButton
                sources={fieldSources}
                onInsert={(token) => {
                  const next = insertInto(
                    item.number,
                    token,
                    numberRef.current,
                  );
                  onChange({ title: item.title, number: next });
                  requestAnimationFrame(() => numberRef.current?.focus());
                }}
              />
            </div>
          </label>

          {isReset ? (
            <p
              className="text-[10px] leading-snug"
              style={{ color: "var(--editor-muted)" }}
            >
              Will restore this hotspot&apos;s original title and number
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChangeHotspotNumberTitleNode({
  data,
  selected,
}: NodeProps<ChangeHotspotNumberTitleFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const hotspots = useEditorStore((s) => s.hotspots);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore(
    (s) => s.scenes.find((scene) => scene.id === s.activeSceneId)?.startActions,
  );
  const menuButtons = useSettingsStore((s) => s.customMenuButtons);
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "changeHotspotNumberTitle"
      ? { items: ownedNode.data.items ?? [] }
      : EMPTY_DATA;
  const fieldSources = useMemo(
    () => (actionNodeId ? listAllFieldSources(actionNodeId) : []),
    [actionNodeId, hotspots, appStartActions, sceneStartActions, menuButtons],
  );
  const addedIds = new Set(live.items.map((item) => item.hotspotId));
  const available = hotspots.filter((hotspot) => !addedIds.has(hotspot.id));
  const [pickerId, setPickerId] = useState("");
  const selectedPickerId =
    pickerId && available.some((hotspot) => String(hotspot.id) === pickerId)
      ? pickerId
      : available[0]
        ? String(available[0].id)
        : "";

  if (!actionNodeId) return null;

  const patch = (partial: Partial<ChangeHotspotNumberTitleActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const mapItem = (
    hotspotId: number,
    next: Partial<ChangeHotspotNumberTitleItem>,
  ) =>
    live.items.map((current) =>
      current.hotspotId === hotspotId ? { ...current, ...next } : current,
    );

  const addSelected = () => {
    const id = Number(selectedPickerId);
    const hotspot = hotspots.find((item) => item.id === id);
    if (!hotspot || addedIds.has(hotspot.id)) return;
    const nextItems = [
      ...live.items,
      {
        hotspotId: hotspot.id,
        title: hotspot.title,
        number: authoredNumber(hotspot),
        open: false,
      },
    ];
    patch({ items: nextItems });
    const remaining = hotspots.filter(
      (item) => item.id !== hotspot.id && !addedIds.has(item.id),
    );
    setPickerId(remaining[0] ? String(remaining[0].id) : "");
  };

  return (
    <ActionNodeCard
      label="Change Number & Title"
      icon={Hash}
      accent="#a78bfa"
      selected={selected}
      wide
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--editor-muted)" }}
        >
          {live.items.length === 0
            ? "Add at least one hotspot"
            : `${live.items.length} hotspot${live.items.length === 1 ? "" : "s"}`}
        </div>
      }
    >
      <div className="mb-2">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Hotspot
        </span>
        <div className="editor-hotspot-add-row nodrag nopan nowheel">
          <select
            className="editor-select"
            value={selectedPickerId}
            disabled={available.length === 0}
            onChange={(e) => {
              e.stopPropagation();
              setPickerId(e.target.value);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {available.length === 0 ? (
              <option value="">
                {hotspots.length === 0 ? "No hotspots" : "All hotspots added"}
              </option>
            ) : (
              available.map((hotspot) => (
                <option key={hotspot.id} value={hotspot.id}>
                  {hotspot.title || `Hotspot ${hotspot.id}`} (
                  {formatHotspotRef(hotspot.id)})
                </option>
              ))
            )}
          </select>
          <IconButton
            title="Add selected hotspot"
            disabled={!selectedPickerId}
            style={{ width: 30, height: 31 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              addSelected();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {live.items.length > 0 ? (
        <div className="space-y-2">
          {live.items.map((item) => (
            <NumberTitleItemCard
              key={item.hotspotId}
              item={item}
              hotspot={hotspots.find((hotspot) => hotspot.id === item.hotspotId)}
              fieldSources={fieldSources}
              onChange={(next) =>
                patch({ items: mapItem(item.hotspotId, next) })
              }
              onOpenChange={(open) =>
                patch({ items: mapItem(item.hotspotId, { open }) })
              }
              onReset={() =>
                patch({
                  items: mapItem(item.hotspotId, { title: "", number: "" }),
                })
              }
              onRemove={() =>
                patch({
                  items: live.items.filter(
                    (current) => current.hotspotId !== item.hotspotId,
                  ),
                })
              }
            />
          ))}
        </div>
      ) : null}
    </ActionNodeCard>
  );
}
