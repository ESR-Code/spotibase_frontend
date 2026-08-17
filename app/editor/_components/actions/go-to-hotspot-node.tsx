"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Crosshair } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import {
  APP_START_OWNER_ID,
  isHotspotOwnerId,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  formatHotspotRef,
  resolveGoToHotspotId,
  resolveHotspotRefToId,
} from "@/lib/editor/actions/go-to-hotspot";
import {
  hasFieldTokens,
  insertTextAt,
} from "@/lib/editor/actions/interpolate-fields";
import { listAllFieldSources } from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import {
  GO_TO_HOTSPOT_OFFSETS,
  type GoToHotspotActionNode,
  type GoToHotspotOffset,
} from "@/lib/editor/types/hotspot-action";

export type GoToHotspotFlowNode = Node<ActionFlowNodeData, "goToHotspot">;

const EMPTY_DATA: GoToHotspotActionNode["data"] = {
  hotspotRef: "",
  offset: "self",
  runTargetActions: false,
};

function readGoToHotspotData(
  ownerId: number,
  actionNodeId: string,
): GoToHotspotActionNode["data"] {
  if (isHotspotOwnerId(ownerId)) {
    const hotspot = useEditorStore
      .getState()
      .hotspots.find((h) => h.id === ownerId);
    const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
    if (!node || node.type !== "goToHotspot") return EMPTY_DATA;
    return {
      hotspotRef: node.data.hotspotRef ?? "",
      offset: node.data.offset ?? "self",
      runTargetActions: Boolean(node.data.runTargetActions),
    };
  }

  const scenes = useScenesStore.getState();
  const graph =
    ownerId === APP_START_OWNER_ID
      ? scenes.appStartActions
      : (scenes.scenes.find((sc) => sc.id === scenes.activeSceneId)
          ?.startActions ?? null);
  const node = graph?.nodes.find((n) => n.id === actionNodeId);
  if (!node || node.type !== "goToHotspot") return EMPTY_DATA;
  return {
    hotspotRef: node.data.hotspotRef ?? "",
    offset: node.data.offset ?? "self",
    runTargetActions: Boolean(node.data.runTargetActions),
  };
}

export function GoToHotspotNode({
  data,
  selected,
}: NodeProps<GoToHotspotFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const hotspots = useEditorStore((s) => s.hotspots);
  const refInputRef = useRef<HTMLInputElement>(null);
  const refFocusedRef = useRef(false);
  const [refDraft, setRefDraft] = useState("");

  const hotspotLive = useEditorStore(
    useShallow((s) => {
      if (!actionNodeId || !isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const hotspot = s.hotspots.find((h) => h.id === ownerId);
      const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "goToHotspot") return EMPTY_DATA;
      return {
        hotspotRef: node.data.hotspotRef ?? "",
        offset: node.data.offset ?? "self",
        runTargetActions: Boolean(node.data.runTargetActions),
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
      if (!node || node.type !== "goToHotspot") return EMPTY_DATA;
      return {
        hotspotRef: node.data.hotspotRef ?? "",
        offset: node.data.offset ?? "self",
        runTargetActions: Boolean(node.data.runTargetActions),
      };
    }),
  );

  const live = isHotspotOwnerId(ownerId) ? hotspotLive : startLive;
  const fieldSources = useMemo(
    () => (actionNodeId ? listAllFieldSources(actionNodeId) : []),
    [actionNodeId],
  );

  if (!actionNodeId) return null;

  const hotspotRef = refFocusedRef.current ? refDraft : live.hotspotRef;
  const staticId = hasFieldTokens(hotspotRef)
    ? null
    : resolveHotspotRefToId(hotspotRef, { interpolate: false });
  const selectValue =
    staticId && hotspots.some((h) => h.id === staticId) ? String(staticId) : "";
  const resolvedId =
    staticId != null
      ? resolveGoToHotspotId(staticId, live.offset)
      : null;
  const resolved = resolvedId
    ? hotspots.find((hotspot) => hotspot.id === resolvedId)
    : null;

  const warning = !hotspotRef.trim()
    ? "Select or enter a target hotspot"
    : hasFieldTokens(hotspotRef)
      ? null
      : staticId == null
        ? "Enter HSP-###, a numeric id, or HSP-{{field}}"
        : !hotspots.some((h) => h.id === staticId)
          ? "Target hotspot no longer exists"
          : null;

  const patch = (partial: Partial<GoToHotspotActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const commitRef = (next: string) => {
    setRefDraft(next);
    patch({ hotspotRef: next });
  };

  const insertInto = (
    current: string,
    token: string,
    el: HTMLInputElement | null,
  ) => {
    if (!el) return insertTextAt(current, token, current.length);
    return insertTextAt(
      current,
      token,
      el.selectionStart ?? current.length,
      el.selectionEnd ?? current.length,
    );
  };

  const setOffset = (offset: GoToHotspotOffset) => {
    if (offset !== "self" && live.offset === offset) {
      patch({ offset: "self" });
      return;
    }
    patch({ offset });
  };

  return (
    <ActionNodeCard
      label="Go To Hotspot"
      icon={Crosshair}
      accent="#f0a35a"
      selected={selected}
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        warning ? (
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--editor-amber)" }}
          >
            {warning}
          </div>
        ) : hasFieldTokens(hotspotRef) ? (
          <div
            className="truncate text-[10px] font-medium"
            style={{ color: "var(--editor-muted)" }}
          >
            → dynamic {hotspotRef}
            {live.runTargetActions ? " + actions" : ""}
          </div>
        ) : resolved ? (
          <div
            className="truncate text-[10px] font-medium"
            style={{ color: "var(--editor-muted)" }}
          >
            → {resolved.title || `Hotspot ${resolved.id}`}
            {live.runTargetActions ? " + actions" : ""}
          </div>
        ) : null
      }
    >
      <label className="mb-2 block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Target hotspot
        </span>
        <select
          className="editor-select nodrag nopan nowheel mb-1.5"
          value={selectValue}
          onChange={(e) => {
            e.stopPropagation();
            const id = e.target.value ? Number(e.target.value) : 0;
            const next = id > 0 ? formatHotspotRef(id) : "";
            commitRef(next);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">
            {hasFieldTokens(hotspotRef) ? "Custom / variable…" : "Select hotspot…"}
          </option>
          {hotspots.map((hotspot) => (
            <option key={hotspot.id} value={hotspot.id}>
              {hotspot.title || `Hotspot ${hotspot.id}`} (
              {formatHotspotRef(hotspot.id)})
            </option>
          ))}
        </select>
        <div className="editor-var-field">
          <input
            ref={refInputRef}
            className="editor-input nodrag nopan nowheel"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="HSP-001 or HSP-{{id}}"
            value={hotspotRef}
            onFocus={() => {
              refFocusedRef.current = true;
              setRefDraft(live.hotspotRef);
            }}
            onChange={(e) => commitRef(e.target.value)}
            onBlur={(e) => {
              refFocusedRef.current = false;
              commitRef(e.currentTarget.value);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <VariableInsertButton
            sources={fieldSources}
            onInsert={(token) => {
              const current = readGoToHotspotData(ownerId, actionNodeId)
                .hotspotRef;
              const base = refFocusedRef.current ? refDraft : current;
              // Prefer HSP-{{field}} when the field is empty.
              const insert =
                !base.trim() && token.startsWith("{{")
                  ? `HSP-${token}`
                  : token;
              const next = insertInto(base, insert, refInputRef.current);
              commitRef(next);
              requestAnimationFrame(() => refInputRef.current?.focus());
            }}
          />
        </div>
      </label>

      <div className="mb-2">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Offset
        </span>
        <div className="editor-pill-row nodrag nopan">
          {GO_TO_HOTSPOT_OFFSETS.map((option) => (
            <TypePill
              key={option.value}
              active={live.offset === option.value}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setOffset(option.value);
              }}
            >
              {option.label}
            </TypePill>
          ))}
        </div>
      </div>

      <div
        className="nodrag nopan"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <SwitchField
          label="Run target actions"
          description="After focusing, fire the destination hotspot's action chain"
          checked={live.runTargetActions}
          onChange={(checked) => patch({ runTargetActions: checked })}
        />
      </div>
    </ActionNodeCard>
  );
}
