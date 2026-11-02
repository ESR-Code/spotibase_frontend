"use client";

import type { CSSProperties } from "react";
import { Layers } from "lucide-react";
import { resolveAssetSrc } from "@/lib/editor/assets/resolve";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  SCENE_TRANSITION_FADE_MS,
  SCENE_TRANSITION_SPEED_FACTOR,
} from "@/lib/editor/types/editor-settings";

export function SceneTransitionOverlay() {
  const transition = useUIStore((s) => s.sceneTransition);
  const variant = useGeneralSettingsStore((s) => s.sceneTransitionStyle);
  const speed = useGeneralSettingsStore((s) => s.sceneTransitionSpeed);

  if (!transition) return null;

  const fadeMs = Math.round(
    SCENE_TRANSITION_FADE_MS * (SCENE_TRANSITION_SPEED_FACTOR[speed] ?? 1),
  );
  const minimal = variant === "minimal";

  return (
    <div
      className={`editor-scene-transition variant-${variant} phase-${transition.phase}`}
      style={{ "--scene-transition-fade": `${fadeMs}ms` } as CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={`Entering ${transition.sceneName}`}
    >
      <div className="editor-scene-transition-content">
        {transition.thumbnailUrl ? (
          <div
            className={`editor-scene-transition-thumb ${minimal ? "small" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAssetSrc(transition.thumbnailUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        {minimal ? null : (
          <>
            {variant === "wipe" || transition.thumbnailUrl ? null : (
              <div className="editor-scene-transition-icon">
                <Layers className="h-5 w-5" />
              </div>
            )}
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Entering scene
            </div>
          </>
        )}
        <div
          className={`font-display font-bold leading-tight ${minimal ? "text-[22px] tracking-wide" : "text-[28px]"}`}
        >
          {transition.sceneName}
        </div>
        {variant === "wipe" ? (
          <div className="editor-scene-transition-bar" />
        ) : null}
      </div>
    </div>
  );
}
