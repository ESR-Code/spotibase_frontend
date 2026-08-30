"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { getOwnedActionGraph } from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  findUpstreamForEach,
  sampleForEachItems,
} from "@/lib/editor/actions/for-each";
import {
  insertTextAt,
  withActionItemScopeSync,
} from "@/lib/editor/actions/interpolate-fields";
import {
  COMPARE_OP_LABELS,
  sampleSwitchHandle,
  switchHandleLabel,
  validateSwitchData,
} from "@/lib/editor/actions/switch-case";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import {
  fieldSourcesFromValue,
  listAllFieldSources,
} from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import {
  COMPARE_OPS,
  SWITCH_HANDLE_DEFAULT,
  createEmptySwitchCase,
  switchCaseHandleId,
  type CompareOp,
  type SwitchCase,
} from "@/lib/editor/types/hotspot-action";

export type SwitchFlowNode = Node<ActionFlowNodeData, "switch">;

const stop = {
  onPointerDown: (e: PointerEvent) => e.stopPropagation(),
  onClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
} as const;

export function SwitchNode({ data, selected }: NodeProps<SwitchFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const subjectRef = useRef<HTMLInputElement>(null);

  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);

  const hotspots = useEditorStore((s) => s.hotspots);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);

  const fieldSources = useMemo(() => {
    if (!actionNodeId) return [];
    const global = listAllFieldSources(actionNodeId);
    const graph = getOwnedActionGraph(ownerId);
    const forEach = graph ? findUpstreamForEach(graph, actionNodeId) : null;
    if (!graph || !forEach) return global;
    const items = sampleForEachItems(graph, forEach);
    const first = items?.[0];
    if (first === undefined) return global;
    const itemSources = fieldSourcesFromValue(first, {
      nodeId: forEach.id,
      ownerId,
      nodeLabel: "For Each item",
    });
    return [...itemSources, ...global];
  }, [
    actionNodeId,
    ownerId,
    hotspots,
    appStartActions,
    sceneStartActions,
    customMenuButtons,
  ]);

  if (!actionNodeId) return null;

  const subject = ownedNode?.type === "switch" ? ownedNode.data.subject : "";
  const cases: SwitchCase[] =
    ownedNode?.type === "switch" ? ownedNode.data.cases : [];

  const patch = (partial: { subject?: string; cases?: SwitchCase[] }) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const warning =
    ownedNode?.type === "switch" ? validateSwitchData(ownedNode) : null;

  const graph = getOwnedActionGraph(ownerId);
  const forEach = graph ? findUpstreamForEach(graph, actionNodeId) : null;
  const sampleItem =
    graph && forEach ? sampleForEachItems(graph, forEach)?.[0] : undefined;
  const sampleHandle =
    ownedNode?.type === "switch"
      ? sampleItem !== undefined
        ? withActionItemScopeSync(sampleItem, 0, () =>
            sampleSwitchHandle(ownedNode),
          )
        : sampleSwitchHandle(ownedNode)
      : null;
  const sampleLabel =
    ownedNode?.type === "switch" && sampleHandle
      ? switchHandleLabel(ownedNode.data, sampleHandle)
      : null;

  const updateCase = (caseId: string, partial: Partial<SwitchCase>) => {
    patch({
      cases: cases.map((item) =>
        item.id === caseId ? { ...item, ...partial } : item,
      ),
    });
  };

  return (
    <ActionNodeCard
      label="Switch"
      icon={GitBranch}
      accent="#c9a227"
      selected={selected}
      showSource={false}
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
        ) : sampleLabel ? (
          <div className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
            Sample → {sampleLabel}
          </div>
        ) : null
      }
    >
      <label className="block">
        <span
          className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Field
          <VariableInsertButton
            sources={fieldSources}
            onInsert={(token) => {
              const current = subject;
              patch({
                subject: insertTextAt(
                  current,
                  token,
                  subjectRef.current?.selectionStart ?? current.length,
                  subjectRef.current?.selectionEnd ?? current.length,
                ),
              });
            }}
          />
        </span>
        <input
          ref={subjectRef}
          className="editor-input nodrag nopan nowheel"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="{{builtIn}}"
          value={subject}
          onChange={(e) => {
            e.stopPropagation();
            patch({ subject: e.target.value });
          }}
          {...stop}
        />
      </label>

      <div className="editor-action-event-handles editor-switch-cases">
        {cases.map((item, index) => (
          <SwitchCaseRow
            key={item.id}
            index={index}
            item={item}
            sources={fieldSources}
            canRemove
            onChange={(partial) => updateCase(item.id, partial)}
            onRemove={() =>
              patch({ cases: cases.filter((entry) => entry.id !== item.id) })
            }
          />
        ))}

        <div className="editor-action-event-handle-row editor-switch-default-row">
          <button
            type="button"
            className="editor-http-headers-add nodrag nopan"
            onClick={(e) => {
              e.stopPropagation();
              patch({ cases: [...cases, createEmptySwitchCase()] });
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Plus className="h-3 w-3" />
            Add case
          </button>
        </div>

        <div className="editor-action-event-handle-row">
          <span className="editor-action-event-handle-label">Default</span>
          <Handle
            id={SWITCH_HANDLE_DEFAULT}
            type="source"
            position={Position.Right}
            className="editor-action-handle editor-action-handle-event"
          />
        </div>
      </div>
    </ActionNodeCard>
  );
}

function SwitchCaseRow({
  index,
  item,
  sources,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  item: SwitchCase;
  sources: ReturnType<typeof listAllFieldSources>;
  canRemove: boolean;
  onChange: (partial: Partial<SwitchCase>) => void;
  onRemove: () => void;
}) {
  const rightRef = useRef<HTMLInputElement>(null);
  const preview = item.right.trim()
    ? `${COMPARE_OP_LABELS[item.operator]} ${item.right}`
    : `Case ${index + 1}`;

  return (
    <div className="editor-switch-case">
      <div className="editor-action-event-handle-row">
        <span
          className="editor-action-event-handle-label min-w-0 truncate"
          title={preview}
        >
          {preview}
        </span>
        {canRemove ? (
          <IconButton
            title="Remove case"
            style={{ width: 22, height: 22, marginRight: 8 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-3 w-3" />
          </IconButton>
        ) : null}
        <Handle
          id={switchCaseHandleId(item.id)}
          type="source"
          position={Position.Right}
          className="editor-action-handle editor-action-handle-event"
        />
      </div>
      <div className="editor-switch-case-fields nodrag nopan nowheel">
        <select
          className="editor-select editor-switch-op"
          value={item.operator}
          onChange={(e) => onChange({ operator: e.target.value as CompareOp })}
          {...stop}
        >
          {COMPARE_OPS.map((op) => (
            <option key={op} value={op}>
              {COMPARE_OP_LABELS[op]}
            </option>
          ))}
        </select>
        <input
          ref={rightRef}
          className="editor-input min-w-0 flex-1"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="value"
          value={item.right}
          onChange={(e) => onChange({ right: e.target.value })}
          {...stop}
        />
        <VariableInsertButton
          sources={sources}
          onInsert={(token) => {
            const current = item.right;
            onChange({
              right: insertTextAt(
                current,
                token,
                rightRef.current?.selectionStart ?? current.length,
                rightRef.current?.selectionEnd ?? current.length,
              ),
            });
          }}
        />
      </div>
    </div>
  );
}
