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
  asPlayAnimationMode,
  asPlayAnimationStopBehavior,
  asPlayAnimationTime,
  clampPlayAnimationSpeed,
  isPlayAnimationLoopMode,
  PLAY_ANIMATION_SPEED_DEFAULT,
  PLAY_ANIMATION_SPEED_MAX,
  PLAY_ANIMATION_SPEED_MIN,
  resolvePlayAnimationRange,
  type PlayAnimationActionNode,
  type PlayAnimationMode,
  type PlayAnimationStopBehavior,
} from "@/lib/editor/types/hotspot-action";

export type PlayAnimationFlowNode = Node<ActionFlowNodeData, "playAnimation">;

const MODE_OPTIONS: { value: PlayAnimationMode; label: string }[] = [
  { value: "once", label: "Play once" },
  { value: "loop", label: "Loop" },
  { value: "pingPong", label: "Ping-pong" },
  { value: "stop", label: "Stop loop" },
];

const MODE_FOOTER: Partial<Record<PlayAnimationMode, string>> = {
  loop: "loop",
  pingPong: "ping-pong",
};

const EMPTY_DATA: PlayAnimationActionNode["data"] = {
  mode: "once",
  resumeAfterInterrupt: true,
  stopBehavior: "hold",
  animationName: "",
  inverse: false,
  speed: PLAY_ANIMATION_SPEED_DEFAULT,
  startTime: 0,
  endTime: 0,
};

function formatSeconds(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "") || "0";
}

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

  const mode = asPlayAnimationMode(live.mode);
  const isStop = mode === "stop";
  const stopBehavior = asPlayAnimationStopBehavior(live.stopBehavior);
  const clipOptions = isModelScene ? animations : [];
  const warning =
    ownedNode?.type === "playAnimation"
      ? validatePlayAnimationData(ownedNode.data)
      : "Select an animation";
  const selectedClip = clipOptions.find((clip) => clip.id === live.animationName);
  const speed = clampPlayAnimationSpeed(live.speed);
  const clipDuration = selectedClip?.duration ?? 0;
  const range = resolvePlayAnimationRange(live, clipDuration);
  const trimmed =
    clipDuration > 0 &&
    (range.startTime > 0.001 || range.endTime < clipDuration - 0.001);

  const patch = (partial: Partial<PlayAnimationActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const footerDetail = isStop
    ? stopBehavior === "rest"
      ? "stop · rest pose"
      : "stop · hold pose"
    : !selectedClip
    ? null
    : [
        MODE_FOOTER[mode] ?? null,
        selectedClip.name,
        trimmed
          ? `${formatSeconds(range.startTime)}–${formatSeconds(range.endTime)}s`
          : null,
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
          Mode
        </span>
        <select
          className="editor-select"
          value={mode}
          disabled={!isModelScene}
          onChange={(e) => {
            e.stopPropagation();
            patch({ mode: e.target.value as PlayAnimationMode });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {isStop ? (
        <label className="mt-2 block">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            After stop
          </span>
          <select
            className="editor-select"
            value={stopBehavior}
            onChange={(e) => {
              e.stopPropagation();
              patch({
                stopBehavior: e.target.value as PlayAnimationStopBehavior,
              });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="hold">Hold current pose</option>
            <option value="rest">Reset to rest pose</option>
          </select>
        </label>
      ) : (
        <>
          <label className="mt-2 block">
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
                const nextId = e.target.value;
                const clip = clipOptions.find((item) => item.id === nextId);
                patch({
                  animationName: nextId,
                  startTime: 0,
                  endTime: clip?.duration ?? 0,
                });
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

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--editor-muted-2)" }}
              >
                Start (s)
              </span>
              <input
                className="editor-input nodrag nopan nowheel"
                type="number"
                min={0}
                max={clipDuration || undefined}
                step={0.01}
                disabled={!selectedClip}
                value={asPlayAnimationTime(live.startTime, 0)}
                aria-label="Animation start time"
                onChange={(e) =>
                  patch({ startTime: asPlayAnimationTime(e.target.value, 0) })
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
            <label className="block">
              <span
                className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--editor-muted-2)" }}
              >
                <span>End (s)</span>
                {clipDuration > 0 ? (
                  <span className="font-medium normal-case tracking-normal">
                    clip {formatSeconds(clipDuration)}s
                  </span>
                ) : null}
              </span>
              <input
                className="editor-input nodrag nopan nowheel"
                type="number"
                min={0}
                max={clipDuration || undefined}
                step={0.01}
                disabled={!selectedClip}
                value={
                  live.endTime > 0
                    ? asPlayAnimationTime(live.endTime, 0)
                    : clipDuration || 0
                }
                aria-label="Animation end time"
                onChange={(e) =>
                  patch({ endTime: asPlayAnimationTime(e.target.value, 0) })
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>

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

          {isPlayAnimationLoopMode(mode) ? (
            <div
              className="mt-2 nodrag nopan"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <SwitchField
                label="Resume after other animations"
                description="Restart this loop when a Play once clip finishes"
                checked={live.resumeAfterInterrupt !== false}
                onChange={(resumeAfterInterrupt) => patch({ resumeAfterInterrupt })}
              />
            </div>
          ) : null}
        </>
      )}
    </ActionNodeCard>
  );
}
