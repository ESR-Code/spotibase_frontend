"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Repeat } from "lucide-react";
import { useMemo, useRef } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { getOwnedActionGraph } from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  countForEachSampleItems,
  validateForEachData,
} from "@/lib/editor/actions/for-each";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import {
  listAllFieldSources,
  type HttpFieldSource,
} from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

export type ForEachFlowNode = Node<ActionFlowNodeData, "forEach">;

function preferArraySources(sources: HttpFieldSource[]): HttpFieldSource[] {
  const arrays = sources.filter((source) => source.sample.startsWith("Array("));
  return arrays.length > 0 ? arrays : sources;
}

export function ForEachNode({ data, selected }: NodeProps<ForEachFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const pathRef = useRef<HTMLInputElement>(null);

  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const itemsPath =
    ownedNode?.type === "forEach" ? ownedNode.data.itemsPath : "";

  const hotspots = useEditorStore((s) => s.hotspots);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);

  const fieldSources = useMemo(
    () => preferArraySources(listAllFieldSources(actionNodeId)),
    [
      actionNodeId,
      appStartActions,
      hotspots,
      sceneStartActions,
      customMenuButtons,
    ],
  );

  if (!actionNodeId) return null;

  const warning =
    ownedNode?.type === "forEach" ? validateForEachData(ownedNode) : null;
  const graph = getOwnedActionGraph(ownerId);
  const count =
    ownedNode?.type === "forEach" && graph
      ? countForEachSampleItems(graph, ownedNode)
      : null;

  return (
    <ActionNodeCard
      label="For Each"
      icon={Repeat}
      accent="#5ad0c8"
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
        ) : count != null ? (
          <div className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
            {count} {count === 1 ? "item" : "items"}
            {itemsPath.trim()
              ? ` from ${itemsPath.replace(/^\{\{|\}\}$/g, "")}`
              : ""}
          </div>
        ) : null
      }
    >
      <label className="block">
        <span
          className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Items array
          <VariableInsertButton
            sources={fieldSources}
            onInsert={(token) => {
              const current = itemsPath;
              const next = insertTextAt(
                current,
                token,
                pathRef.current?.selectionStart ?? current.length,
                pathRef.current?.selectionEnd ?? current.length,
              );
              updateNodeData(ownerId, actionNodeId, { itemsPath: next });
            }}
            emptyTitle="Test an HTTP Request or declare Post Message fields first"
          />
        </span>
        <input
          ref={pathRef}
          className="editor-input nodrag nopan nowheel"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="items or {{items}}"
          value={itemsPath}
          onChange={(e) => {
            e.stopPropagation();
            updateNodeData(ownerId, actionNodeId, {
              itemsPath: e.target.value,
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
