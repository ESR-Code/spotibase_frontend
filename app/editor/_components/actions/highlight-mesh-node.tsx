"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ChevronDown, Highlighter } from "lucide-react";
import type { ReactNode } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import {
  DEFAULT_MESH_STROKE_COLOR,
  DEFAULT_MESH_STROKE_WIDTH,
  DEFAULT_MESH_TINT_COLOR,
  DEFAULT_MESH_TINT_OPACITY,
} from "@/lib/editor/actions/highlight-mesh";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { markerColorSwatches } from "@/lib/editor/theme/tokens";
import type { HighlightMeshActionNode } from "@/lib/editor/types/hotspot-action";

export type HighlightMeshFlowNode = Node<ActionFlowNodeData, "highlightMesh">;

const EMPTY_DATA: HighlightMeshActionNode["data"] = {
  meshIds: [],
  tintEnabled: true,
  tintColor: DEFAULT_MESH_TINT_COLOR,
  tintOpacity: DEFAULT_MESH_TINT_OPACITY,
  strokeEnabled: true,
  strokeColor: DEFAULT_MESH_STROKE_COLOR,
  strokeWidth: DEFAULT_MESH_STROKE_WIDTH,
  tintSectionOpen: true,
  strokeSectionOpen: true,
  meshesSectionOpen: false,
};

function toggleId(selected: string[], id: string, checked: boolean): string[] {
  if (checked) {
    return selected.includes(id) ? selected : [...selected, id];
  }
  return selected.filter((item) => item !== id);
}

function NodeSection({
  title,
  badge,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="editor-enable-disable-panel nodrag nopan nowheel">
      <button
        type="button"
        className="editor-enable-disable-toggle"
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <span>{title}</span>
        <span
          className="flex items-center gap-1.5"
          style={{ color: "var(--editor-muted)" }}
        >
          {badge ? (
            <span className="text-[10px] font-medium">{badge}</span>
          ) : null}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open ? (
        <div
          className="space-y-2 border-t px-2.5 py-2"
          style={{ borderColor: "var(--editor-line-soft)" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function NodeColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const isCustom =
    value !== "" &&
    !markerColorSwatches.includes(value as (typeof markerColorSwatches)[number]);

  return (
    <div className="nodrag nopan nowheel space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="editor-swatch-row">
        {markerColorSwatches.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            selected={value === color}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChange(color);
            }}
          />
        ))}
        <label
          className={`editor-swatch editor-swatch-custom ${isCustom ? "selected" : ""}`}
          title="Custom color"
          style={isCustom ? { background: value } : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="color"
            aria-label={`Custom ${label.toLowerCase()}`}
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export function HighlightMeshNode({
  data,
  selected,
}: NodeProps<HighlightMeshFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const activeScene = useActiveScene();
  const isModelScene = activeScene.type === "model";
  const meshes = useModelStore((s) => s.meshes);
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "highlightMesh"
      ? {
          meshIds: ownedNode.data.meshIds ?? [],
          tintEnabled: ownedNode.data.tintEnabled !== false,
          tintColor: ownedNode.data.tintColor || DEFAULT_MESH_TINT_COLOR,
          tintOpacity:
            typeof ownedNode.data.tintOpacity === "number"
              ? ownedNode.data.tintOpacity
              : DEFAULT_MESH_TINT_OPACITY,
          strokeEnabled: Boolean(ownedNode.data.strokeEnabled),
          strokeColor: ownedNode.data.strokeColor || DEFAULT_MESH_STROKE_COLOR,
          strokeWidth:
            typeof ownedNode.data.strokeWidth === "number"
              ? ownedNode.data.strokeWidth
              : DEFAULT_MESH_STROKE_WIDTH,
          tintSectionOpen: ownedNode.data.tintSectionOpen !== false,
          strokeSectionOpen: ownedNode.data.strokeSectionOpen !== false,
          meshesSectionOpen: Boolean(ownedNode.data.meshesSectionOpen),
        }
      : EMPTY_DATA;

  if (!actionNodeId) return null;

  const meshOptions = isModelScene ? meshes : [];
  const meshIds = meshOptions.map((mesh) => mesh.id);
  const selectedCount = live.meshIds.filter((id) =>
    meshOptions.some((option) => option.id === id),
  ).length;
  const allSelected =
    meshIds.length > 0 && meshIds.every((id) => live.meshIds.includes(id));
  const restoreOriginals = !live.tintEnabled && !live.strokeEnabled;

  const patch = (partial: Partial<HighlightMeshActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  return (
    <ActionNodeCard
      label="Highlight Mesh"
      icon={Highlighter}
      accent="#ffd166"
      selected={selected}
      wide
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--editor-muted)" }}
        >
          {!isModelScene
            ? "3D model scenes only"
            : selectedCount === 0
              ? "No meshes selected"
              : restoreOriginals
                ? allSelected
                  ? "All meshes stay original"
                  : `${selectedCount} mesh${selectedCount === 1 ? "" : "es"} restored to original`
                : `${selectedCount} mesh${selectedCount === 1 ? "" : "es"} highlighted`}
        </div>
      }
    >
      <p
        className="mb-2 text-[10px] leading-snug"
        style={{ color: "var(--editor-muted)" }}
      >
        Check meshes to tint and/or outline. Wire more Highlight Mesh
        nodes after this one to color other meshes. Turn both off to
        restore those meshes to their original materials.
      </p>

      <div className="editor-enable-disable-panel nodrag nopan nowheel">
        <button
          type="button"
          className="editor-enable-disable-toggle"
          aria-expanded={live.meshesSectionOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            patch({ meshesSectionOpen: !live.meshesSectionOpen });
          }}
        >
          <span>Meshes</span>
          <span
            className="flex items-center gap-1.5"
            style={{ color: "var(--editor-muted)" }}
          >
            <span className="text-[10px] font-medium">
              {selectedCount}/{meshOptions.length} selected
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${live.meshesSectionOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {live.meshesSectionOpen ? (
          <div className="editor-enable-disable-targets">
            <div className="editor-enable-disable-group">
              <div className="editor-enable-disable-group-header">
                <div className="editor-enable-disable-group-label">
                  Model meshes
                </div>
                <button
                  type="button"
                  className="editor-enable-disable-group-all"
                  disabled={meshOptions.length === 0}
                  title={allSelected ? "Deselect all" : "Select all"}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    patch({ meshIds: allSelected ? [] : [...meshIds] });
                  }}
                >
                  {allSelected ? "None" : "All"}
                </button>
              </div>
              {!isModelScene ? (
                <div
                  className="px-2 py-1.5 text-[10px]"
                  style={{ color: "var(--editor-muted)" }}
                >
                  Switch to a 3D scene to highlight model meshes
                </div>
              ) : meshOptions.length === 0 ? (
                <div
                  className="px-2 py-1.5 text-[10px]"
                  style={{ color: "var(--editor-muted)" }}
                >
                  No meshes in this 3D model
                </div>
              ) : (
                meshOptions.map((option) => {
                  const checked = live.meshIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="editor-enable-disable-option"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="editor-checkbox"
                        checked={checked}
                        onChange={(e) => {
                          e.stopPropagation();
                          patch({
                            meshIds: toggleId(
                              live.meshIds,
                              option.id,
                              e.target.checked,
                            ),
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate" title={option.id}>
                        {option.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 space-y-2">
        <NodeSection
          title="Tint"
          badge={live.tintEnabled ? "On" : "Off"}
          open={live.tintSectionOpen !== false}
          onOpenChange={(tintSectionOpen) => patch({ tintSectionOpen })}
        >
          <div
            className="nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <SwitchField
              label="Enable tint"
              description="Blend a color over the original mesh shading"
              checked={live.tintEnabled}
              onChange={(tintEnabled) => patch({ tintEnabled })}
            />
          </div>
          {live.tintEnabled ? (
            <>
              <NodeColorPicker
                label="Tint color"
                value={live.tintColor}
                onChange={(tintColor) => patch({ tintColor })}
              />
              <div
                className="nodrag nopan nowheel"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <FieldLabel className="flex justify-between">
                  <span>Tint opacity</span>
                  <span>{Math.round(live.tintOpacity * 100)}%</span>
                </FieldLabel>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={live.tintOpacity}
                  aria-label="Tint opacity"
                  onChange={(e) =>
                    patch({ tintOpacity: parseFloat(e.target.value) })
                  }
                />
              </div>
            </>
          ) : null}
        </NodeSection>

        <NodeSection
          title="Stroke"
          badge={live.strokeEnabled ? "On" : "Off"}
          open={live.strokeSectionOpen !== false}
          onOpenChange={(strokeSectionOpen) => patch({ strokeSectionOpen })}
        >
          <div
            className="nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <SwitchField
              label="Enable stroke"
              description="Draw an outline around selected meshes"
              checked={live.strokeEnabled}
              onChange={(strokeEnabled) => patch({ strokeEnabled })}
            />
          </div>
          {live.strokeEnabled ? (
            <>
              <NodeColorPicker
                label="Stroke color"
                value={live.strokeColor}
                onChange={(strokeColor) => patch({ strokeColor })}
              />
              <div
                className="nodrag nopan nowheel"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <FieldLabel className="flex justify-between">
                  <span>Stroke width</span>
                  <span>{live.strokeWidth.toFixed(1)}×</span>
                </FieldLabel>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.25}
                  value={live.strokeWidth}
                  aria-label="Stroke width"
                  onChange={(e) =>
                    patch({ strokeWidth: parseFloat(e.target.value) })
                  }
                />
              </div>
            </>
          ) : null}
        </NodeSection>
      </div>
    </ActionNodeCard>
  );
}
