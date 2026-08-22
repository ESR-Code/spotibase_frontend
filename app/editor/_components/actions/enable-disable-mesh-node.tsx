"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Boxes, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import type { EnableDisableMeshActionNode } from "@/lib/editor/types/hotspot-action";

export type EnableDisableMeshFlowNode = Node<
  ActionFlowNodeData,
  "enableDisableMesh"
>;

const EMPTY_DATA: EnableDisableMeshActionNode["data"] = {
  disabledMeshIds: [],
};

function toggleDisabledId(
  disabled: string[],
  id: string,
  enabled: boolean,
): string[] {
  if (enabled) {
    return disabled.filter((item) => item !== id);
  }
  return disabled.includes(id) ? disabled : [...disabled, id];
}

export function EnableDisableMeshNode({
  data,
  selected,
}: NodeProps<EnableDisableMeshFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const activeScene = useActiveScene();
  const isModelScene = activeScene.type === "model";
  const meshes = useModelStore((s) => s.meshes);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "enableDisableMesh"
      ? { disabledMeshIds: ownedNode.data.disabledMeshIds ?? [] }
      : EMPTY_DATA;

  if (!actionNodeId) return null;

  const meshOptions = isModelScene ? meshes : [];
  const meshIds = meshOptions.map((mesh) => mesh.id);
  const disabledCount = live.disabledMeshIds.filter((id) =>
    meshOptions.some((option) => option.id === id),
  ).length;
  const allEnabled =
    meshIds.length > 0 &&
    meshIds.every((id) => !live.disabledMeshIds.includes(id));

  const patch = (partial: Partial<EnableDisableMeshActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  return (
    <ActionNodeCard
      label="Enable / Disable Mesh"
      icon={Boxes}
      accent="#8eb5d4"
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
            : disabledCount === 0
              ? "All meshes enabled"
              : `${disabledCount} hidden`}
        </div>
      }
    >
      <p
        className="mb-2 text-[10px] leading-snug"
        style={{ color: "var(--editor-muted)" }}
      >
        Check to show, uncheck to hide meshes in the 3D model
      </p>

      <div className="editor-enable-disable-panel nodrag nopan nowheel">
        <button
          type="button"
          className="editor-enable-disable-toggle"
          aria-expanded={targetsOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setTargetsOpen((open) => !open);
          }}
        >
          <span>Meshes</span>
          <span
            className="flex items-center gap-1.5"
            style={{ color: "var(--editor-muted)" }}
          >
            <span className="text-[10px] font-medium">
              {meshOptions.length} mesh{meshOptions.length === 1 ? "" : "es"}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${targetsOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {targetsOpen ? (
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
                  title={allEnabled ? "Hide all" : "Show all"}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    patch({
                      disabledMeshIds: allEnabled
                        ? [...meshIds]
                        : live.disabledMeshIds.filter(
                            (id) => !meshIds.includes(id),
                          ),
                    });
                  }}
                >
                  {allEnabled ? "None" : "All"}
                </button>
              </div>
              {!isModelScene ? (
                <div
                  className="px-2 py-1.5 text-[10px]"
                  style={{ color: "var(--editor-muted)" }}
                >
                  Switch to a 3D scene to control model meshes
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
                  const checked = !live.disabledMeshIds.includes(option.id);
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
                            disabledMeshIds: toggleDisabledId(
                              live.disabledMeshIds,
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
    </ActionNodeCard>
  );
}
