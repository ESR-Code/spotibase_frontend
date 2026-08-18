"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ChevronDown, ToggleLeft } from "lucide-react";
import { useState } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import type { EnableDisableActionNode } from "@/lib/editor/types/hotspot-action";

export type EnableDisableFlowNode = Node<ActionFlowNodeData, "enableDisable">;

const EMPTY_DATA: EnableDisableActionNode["data"] = {
  disabledHotspotIds: [],
  disabledLayerIds: [],
};

function toggleDisabledId<T extends string | number>(
  disabled: T[],
  id: T,
  enabled: boolean,
): T[] {
  if (enabled) {
    return disabled.filter((item) => item !== id);
  }
  return disabled.includes(id) ? disabled : [...disabled, id];
}

function groupAllEnabled<T extends string | number>(
  ids: T[],
  disabled: T[],
): boolean {
  return ids.length > 0 && ids.every((id) => !disabled.includes(id));
}

type GroupHeaderProps = {
  label: string;
  disabled: boolean;
  allEnabled: boolean;
  onToggleAll: () => void;
};

function GroupHeader({
  label,
  disabled,
  allEnabled,
  onToggleAll,
}: GroupHeaderProps) {
  return (
    <div className="editor-enable-disable-group-header">
      <div className="editor-enable-disable-group-label">{label}</div>
      <button
        type="button"
        className="editor-enable-disable-group-all"
        disabled={disabled}
        title={allEnabled ? "Disable all" : "Enable all"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleAll();
        }}
      >
        {allEnabled ? "None" : "All"}
      </button>
    </div>
  );
}

export function EnableDisableNode({
  data,
  selected,
}: NodeProps<EnableDisableFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const activeScene = useActiveScene();
  const layersSupported = getSceneType(activeScene.type).outlinerTabs.layers;
  const hotspots = useEditorStore((s) => s.hotspots);
  const layers = useLayersStore((s) => s.layers);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "enableDisable"
      ? {
          disabledHotspotIds: ownedNode.data.disabledHotspotIds ?? [],
          disabledLayerIds: ownedNode.data.disabledLayerIds ?? [],
        }
      : EMPTY_DATA;

  if (!actionNodeId) return null;

  const hotspotOptions = hotspots.map((hotspot) => ({
    id: hotspot.id,
    label: hotspot.title || `Hotspot ${hotspot.id}`,
    chip: `HSP-${String(hotspot.id).padStart(3, "0")}`,
  }));
  const layerOptions = layersSupported
    ? layers.map((layer) => ({
        id: layer.id,
        label: layer.name || layer.id,
      }))
    : [];
  const itemCount = hotspotOptions.length + layerOptions.length;
  const disabledCount =
    live.disabledHotspotIds.filter((id) =>
      hotspotOptions.some((option) => option.id === id),
    ).length +
    live.disabledLayerIds.filter((id) =>
      layerOptions.some((option) => option.id === id),
    ).length;

  const patch = (partial: Partial<EnableDisableActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const hotspotIds = hotspotOptions.map((option) => option.id);
  const layerIds = layerOptions.map((option) => option.id);
  const hotspotsAllEnabled = groupAllEnabled(
    hotspotIds,
    live.disabledHotspotIds,
  );
  const layersAllEnabled = groupAllEnabled(layerIds, live.disabledLayerIds);

  return (
    <ActionNodeCard
      label="Enable / Disable"
      icon={ToggleLeft}
      accent="#c4a35a"
      selected={selected}
      wide
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--editor-muted)" }}
        >
          {disabledCount === 0
            ? "All items enabled"
            : `${disabledCount} disabled`}
        </div>
      }
    >
      <p
        className="mb-2 text-[10px] leading-snug"
        style={{ color: "var(--editor-muted)" }}
      >
        Check to enable, uncheck to disable items
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
          <span>Targets</span>
          <span
            className="flex items-center gap-1.5"
            style={{ color: "var(--editor-muted)" }}
          >
            <span className="text-[10px] font-medium">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${targetsOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {targetsOpen ? (
          <div className="editor-enable-disable-targets">
            <div className="editor-enable-disable-group">
              <GroupHeader
                label="Hotspots"
                disabled={hotspotOptions.length === 0}
                allEnabled={hotspotsAllEnabled}
                onToggleAll={() => {
                  patch({
                    disabledHotspotIds: hotspotsAllEnabled
                      ? [...hotspotIds]
                      : live.disabledHotspotIds.filter(
                          (id) => !hotspotIds.includes(id),
                        ),
                  });
                }}
              />
              {hotspotOptions.length === 0 ? (
                <div
                  className="px-2 py-1.5 text-[10px]"
                  style={{ color: "var(--editor-muted)" }}
                >
                  No hotspots in this scene
                </div>
              ) : (
                hotspotOptions.map((option) => {
                  const checked = !live.disabledHotspotIds.includes(option.id);
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
                            disabledHotspotIds: toggleDisabledId(
                              live.disabledHotspotIds,
                              option.id,
                              e.target.checked,
                            ),
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      <span
                        className="shrink-0 text-[9px] font-semibold"
                        style={{ color: "var(--editor-muted-2)" }}
                      >
                        {option.chip}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {layersSupported ? (
              <div className="editor-enable-disable-group">
                <GroupHeader
                  label="Layers"
                  disabled={layerOptions.length === 0}
                  allEnabled={layersAllEnabled}
                  onToggleAll={() => {
                    patch({
                      disabledLayerIds: layersAllEnabled
                        ? [...layerIds]
                        : live.disabledLayerIds.filter(
                            (id) => !layerIds.includes(id),
                          ),
                    });
                  }}
                />
                {layerOptions.length === 0 ? (
                  <div
                    className="px-2 py-1.5 text-[10px]"
                    style={{ color: "var(--editor-muted)" }}
                  >
                    No layers in this scene
                  </div>
                ) : (
                  layerOptions.map((option) => {
                    const checked = !live.disabledLayerIds.includes(option.id);
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
                              disabledLayerIds: toggleDisabledId(
                                live.disabledLayerIds,
                                option.id,
                                e.target.checked,
                              ),
                            });
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {option.label}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </ActionNodeCard>
  );
}
