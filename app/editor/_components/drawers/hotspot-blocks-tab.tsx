"use client";

import {
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getBlockDefinition } from "@/app/editor/_components/blocks/block-registry";
import { AddBlockMenu } from "@/app/editor/_components/drawers/add-block-menu";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { createBlock } from "@/lib/editor/blocks/create-block";
import {
  listHttpFieldSources,
  type HttpFieldSource,
} from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotBlockType } from "@/lib/editor/types/hotspot-block";

type HotspotBlocksTabProps = {
  selected: Hotspot;
  onChange?: (blocks: Hotspot["blocks"]) => void;
  fieldSources?: HttpFieldSource[];
};

type BlocksUiState = {
  hotspotId: number;
  focusBlockId: string | null;
  collapsedIds: Set<string>;
  draggingId: string | null;
  overId: string | null;
};

function createBlocksUiState(hotspotId: number): BlocksUiState {
  return {
    hotspotId,
    focusBlockId: null,
    collapsedIds: new Set(),
    draggingId: null,
    overId: null,
  };
}

export function HotspotBlocksTab({
  selected,
  onChange,
  fieldSources,
}: HotspotBlocksTabProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const resolvedFieldSources = useMemo(
    () => fieldSources ?? listHttpFieldSources(selected),
    [appStartActions, fieldSources, sceneStartActions, selected],
  );
  const [uiState, setUiState] = useState<BlocksUiState>(() =>
    createBlocksUiState(selected.id),
  );
  const blocks = selected.blocks;

  if (uiState.hotspotId !== selected.id) {
    setUiState(createBlocksUiState(selected.id));
  }

  const { focusBlockId, collapsedIds, draggingId, overId } =
    uiState.hotspotId === selected.id
      ? uiState
      : createBlocksUiState(selected.id);

  const setFocusBlockId = (focusBlockId: string | null) =>
    setUiState((prev) => ({
      ...(prev.hotspotId === selected.id
        ? prev
        : createBlocksUiState(selected.id)),
      hotspotId: selected.id,
      focusBlockId,
    }));
  const setCollapsedIds = (
    next: Set<string> | ((prev: Set<string>) => Set<string>),
  ) =>
    setUiState((prev) => {
      const base =
        prev.hotspotId === selected.id
          ? prev
          : createBlocksUiState(selected.id);
      return {
        ...base,
        hotspotId: selected.id,
        collapsedIds:
          typeof next === "function" ? next(base.collapsedIds) : next,
      };
    });
  const setDraggingId = (draggingId: string | null) =>
    setUiState((prev) => ({
      ...(prev.hotspotId === selected.id
        ? prev
        : createBlocksUiState(selected.id)),
      hotspotId: selected.id,
      draggingId,
    }));
  const setOverId = (overId: string | null) =>
    setUiState((prev) => ({
      ...(prev.hotspotId === selected.id
        ? prev
        : createBlocksUiState(selected.id)),
      hotspotId: selected.id,
      overId,
    }));

  const allCollapsed =
    blocks.length > 0 && blocks.every((block) => collapsedIds.has(block.id));

  const setBlocks = (next: Hotspot["blocks"]) => {
    if (onChange) {
      onChange(next);
      return;
    }
    updateHotspot(selected.id, { blocks: next });
  };

  const handleAdd = (type: HotspotBlockType) => {
    const block = createBlock(type);
    setBlocks([...blocks, block]);
    setFocusBlockId(block.id);
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(block.id);
      return next;
    });
  };

  const handleBlockChange = (
    id: string,
    patch: Partial<Omit<(typeof blocks)[number], "id" | "type">>,
  ) => {
    setBlocks(
      blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as typeof block) : block,
      ),
    );
  };

  const handleDelete = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id));
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedIds(new Set());
      return;
    }
    setCollapsedIds(new Set(blocks.map((block) => block.id)));
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = blocks.findIndex((block) => block.id === fromId);
    const toIndex = blocks.findIndex((block) => block.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...blocks];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setBlocks(next);
  };

  const emptyHint = useMemo(
    () => (
      <div
        className="rounded-lg px-4 py-6 text-center"
        style={{
          border: "1px dashed var(--editor-line)",
          background: "rgba(11,20,36,0.35)",
        }}
      >
        <div className="mb-1 text-[12px] font-semibold">No blocks yet</div>
        <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
          Add a heading, text, link, image, or video block to build hotspot
          content.
        </div>
      </div>
    ),
    [],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {blocks.length > 0 ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="editor-btn editor-btn-ghost text-[11px]"
            style={{ padding: "4px 8px", color: "var(--editor-muted)" }}
            onClick={toggleAll}
            title={allCollapsed ? "Expand all blocks" : "Collapse all blocks"}
          >
            {allCollapsed ? (
              <>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                Expand all
              </>
            ) : (
              <>
                <ChevronsDownUp className="h-3.5 w-3.5" />
                Collapse all
              </>
            )}
          </button>
        </div>
      ) : null}

      {blocks.length === 0 ? (
        emptyHint
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => {
            const def = getBlockDefinition(block.type);
            const Editor = def.Editor;
            const Icon = def.icon;
            const collapsed = collapsedIds.has(block.id);
            const isDragging = draggingId === block.id;
            const isOver = overId === block.id && draggingId !== block.id;
            const preview = def.collapsedPreview(block);

            return (
              <div
                key={block.id}
                className={`editor-block-card rounded-lg ${isDragging ? "is-dragging" : ""} ${isOver ? "is-drop-target" : ""}`}
                style={{
                  border: "1px solid var(--editor-line-soft)",
                  background: "rgba(11,20,36,0.4)",
                }}
                onDragOver={(e) => {
                  if (!draggingId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overId !== block.id) setOverId(block.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId =
                    draggingId ?? e.dataTransfer.getData("text/block-id");
                  if (fromId) reorder(fromId, block.id);
                  setDraggingId(null);
                  setOverId(null);
                }}
              >
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button
                    type="button"
                    className="editor-block-drag-handle"
                    title="Drag to reorder"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/block-id", block.id);
                      setDraggingId(block.id);
                      setOverId(block.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverId(null);
                    }}
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left"
                    onClick={() => toggleCollapsed(block.id)}
                    aria-expanded={!collapsed}
                    title={collapsed ? "Expand block" : "Collapse block"}
                  >
                    {collapsed ? (
                      <ChevronRight
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: "var(--editor-muted-2)" }}
                      />
                    ) : (
                      <ChevronDown
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: "var(--editor-muted-2)" }}
                      />
                    )}
                    <span
                      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--editor-muted-2)" }}
                    >
                      <Icon className="h-3 w-3" />
                      {def.label}
                    </span>
                    {collapsed ? (
                      <span
                        className="ml-1 truncate text-[11px] font-normal normal-case tracking-normal"
                        style={{ color: "var(--editor-muted)" }}
                      >
                        {preview || "Empty"}
                      </span>
                    ) : null}
                  </button>

                  <IconButton
                    title="Delete block"
                    onClick={() => handleDelete(block.id)}
                    style={{ width: 28, height: 28, color: "#ff8a95" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>

                {!collapsed ? (
                  <div className="px-3 pb-3 pt-1">
                    <Editor
                      block={block}
                      autoFocus={focusBlockId === block.id}
                      hotspotId={selected.id}
                      fieldSources={resolvedFieldSources}
                      onChange={(patch) => handleBlockChange(block.id, patch)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <AddBlockMenu onAdd={handleAdd} />
    </div>
  );
}
