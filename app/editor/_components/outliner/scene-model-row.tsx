"use client";

import { Box, ImageIcon } from "lucide-react";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";

/** Read-only subject summary in the Outliner hierarchy (import lives in Subject). */
export function SceneModelRow() {
  const scene = useActiveScene();
  const descriptor = getSceneType(scene.type);
  const modelName = useModelStore((s) => s.modelName);
  const modelInfo = useModelStore((s) => s.modelInfo);
  const hasUserModel = useModelStore((s) => s.hasUserModel);
  const Icon = scene.type === "image" ? ImageIcon : Box;

  return (
    <div
      className="px-3 py-2.5"
      style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "var(--editor-amber)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold">{modelName}</div>
          <div className="text-[10px]" style={{ color: "var(--editor-muted-2)" }}>
            {hasUserModel
              ? modelInfo
              : `${descriptor.label} · manage in Subject`}
          </div>
        </div>
      </div>
    </div>
  );
}
