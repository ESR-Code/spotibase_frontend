"use client";

import {
  Home,
  Minus,
  Plus,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { runCustomMenuButtonActions } from "@/lib/editor/actions/run-action-graph";
import { useCustomMenuToggleStore } from "@/lib/editor/state/custom-menu-toggle-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { isGeoSceneType } from "@/lib/editor/scene-types/registry";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";

export function ViewportControls() {
  const wireframe = useModelStore((s) => s.wireframe);
  const setWireframe = useModelStore((s) => s.setWireframe);
  const isPreview = useEditorStore((s) => s.isPreview);
  const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen);
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const toggledIds = useCustomMenuToggleStore((s) => s.toggledIds);
  const scene = useActiveScene();
  const isGeo = isGeoSceneType(scene.type);

  return (
    <div className="editor-viewport-controls editor-glass editor-panel-shadow absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl px-2 py-2">
      <ControlButton
        title="Reset view"
        onClick={() => window.dispatchEvent(new Event("editor:reset-camera"))}
      >
        <Home className="h-3.5 w-3.5" />
      </ControlButton>
      <ControlButton
        title="Zoom in"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("editor:zoom", { detail: { delta: -1.25 } }),
          )
        }
      >
        <Plus className="h-3.5 w-3.5" />
      </ControlButton>
      <ControlButton
        title="Zoom out"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("editor:zoom", { detail: { delta: 1.25 } }),
          )
        }
      >
        <Minus className="h-3.5 w-3.5" />
      </ControlButton>
      {isPreview && customMenuButtons.length > 0 ? (
        <>
          <div className="editor-vsep" style={{ height: 18 }} />
          {customMenuButtons.map((button) => {
            const toggled =
              button.toggleEnabled && toggledIds.includes(button.id);
            const Icon = getCategoryLucideIcon(
              toggled ? button.toggledIcon || button.icon : button.icon,
            );
            return (
              <ControlButton
                key={button.id}
                title={button.tooltip || "Custom button"}
                active={toggled}
                onClick={() => {
                  void runCustomMenuButtonActions(button.ownerId);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </ControlButton>
            );
          })}
        </>
      ) : null}
      {!isPreview && !isGeo ? (
        <>
          <div className="editor-vsep" style={{ height: 18 }} />
          <ControlButton
            title="Wireframe"
            active={wireframe}
            onClick={() => setWireframe(!wireframe)}
          >
            <Square className="h-3.5 w-3.5" />
          </ControlButton>
        </>
      ) : null}
      {!isPreview ? (
        <>
          <div className="editor-vsep" style={{ height: 18 }} />
          <ControlButton
            title="Scene settings"
            onClick={() => {
              useUIStore.getState().setGeneralSettingsDrawerOpen(false);
              setSettingsDrawerOpen(true);
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </ControlButton>
        </>
      ) : null}
    </div>
  );
}

function ControlButton({
  children,
  title,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`editor-tool-btn ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
