"use client";

import { Layers } from "lucide-react";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function SceneTransitionOverlay() {
  const transition = useUIStore((s) => s.sceneTransition);

  if (!transition) return null;

  return (
    <div
      className={`editor-scene-transition phase-${transition.phase}`}
      role="status"
      aria-live="polite"
      aria-label={`Entering ${transition.sceneName}`}
    >
      <div className="editor-scene-transition-content">
        <div className="editor-scene-transition-icon">
          <Layers className="h-5 w-5" />
        </div>
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Entering scene
        </div>
        <div className="font-display text-[28px] font-bold leading-tight">
          {transition.sceneName}
        </div>
      </div>
    </div>
  );
}
