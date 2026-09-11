"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { validatePlayAnimationData } from "@/lib/editor/actions/play-animation";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import {
  clampPlayAnimationSpeed,
  PLAY_ANIMATION_SPEED_DEFAULT,
  PLAY_ANIMATION_SPEED_MAX,
  PLAY_ANIMATION_SPEED_MIN,
  type PlayAnimationActionNode,
} from "@/lib/editor/types/hotspot-action";

export type PlayAnimationFlowNode = Node<ActionFlowNodeData, "playAnimation">;

const EMPTY_DATA: PlayAnimationActionNode["data"] = {
  animationName: "",
  inverse: false,
  speed: PLAY_ANIMATION_SPEED_DEFAULT,
};

export function PlayAnimationNode({
  data,
  selected,
}: NodeProps<PlayAnimationFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const activeScene = useActiveScene();
  const isModelScene = activeScene.type === "model";
  const animations = useModelStore((s) => s.animations);
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "playAnimation" ? ownedNode.data : EMPTY_DATA;

  if (!actionNodeId) return null;

  const clipOptions = isModelScene ? animations : [];
  const warning =
    ownedNode?.type === "playAnimation"
      ? validatePlayAnimationData(ownedNode.data)
      : "Select an animation";
  const selectedClip = clipOptions.find((clip) => clip.id === live.animationName);
  const speed = clampPlayAnimationSpeed(live.speed);

  const patch = (partial: Partial<PlayAnimationActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const footerDetail = !selectedClip
    ? null
    : [
        selectedClip.name,
        live.inverse ? "reverse" : null,
        speed !== 1 ? `${speed.toFixed(2).replace(/\.?0+$/, "")}×` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <ActionNodeCard
      label="Animation"
      icon={Play}
      accent="#c084fc"
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
        ) : footerDetail ? (
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--editor-muted)" }}
          >
            {footerDetail}
          </div>
        ) : null
      }
    >
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Clip
        </span>
        <select
          className="editor-select"
          value={live.animationName}
          disabled={!isModelScene || clipOptions.length === 0}
          onChange={(e) => {
            e.stopPropagation();
            patch({ animationName: e.target.value });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">
            {!isModelScene
              ? "3D model scenes only"
              : clipOptions.length === 0
                ? "No animations in this model"
                : "Select animation…"}
          </option>
          {clipOptions.map((clip) => (
            <option key={clip.id} value={clip.id}>
              {clip.name}
            </option>
          ))}
        </select>
      </label>

      <div
        className="mt-2 nodrag nopan"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <SwitchField
          label="Inverse"
          description="Play the clip backwards"
          checked={live.inverse}
          onChange={(inverse) => patch({ inverse })}
        />
      </div>

      <div
        className="mt-2 nodrag nopan nowheel"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <FieldLabel className="flex justify-between">
          <span>Speed</span>
          <span>{speed.toFixed(2)}×</span>
        </FieldLabel>
        <input
          type="range"
          min={PLAY_ANIMATION_SPEED_MIN}
          max={PLAY_ANIMATION_SPEED_MAX}
          step={0.05}
          value={speed}
          aria-label="Animation speed"
          onChange={(e) =>
            patch({ speed: clampPlayAnimationSpeed(parseFloat(e.target.value)) })
          }
        />
      </div>
    </ActionNodeCard>
  );
}
