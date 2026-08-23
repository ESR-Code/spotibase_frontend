"use client";

import type { CSSProperties, ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import { Home, Minus, Plus, Trash2 } from "lucide-react";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { createCustomMenuButton } from "@/lib/editor/actions/custom-menu-buttons";
import { migrateMenuButtonToggleHandles } from "@/lib/editor/actions/graph-ops";
import { syncActiveSceneSettings } from "@/lib/editor/state/scenes-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { generalStyleToCssVars } from "@/lib/editor/theme/preview-style-vars";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";
import type { CustomMenuButton } from "@/lib/editor/types/editor-settings";

export function CustomMenuSection() {
  const buttons = useSettingsStore((s) => s.customMenuButtons);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const generalStyle = useGeneralSettingsStore((s) => s.style);

  const persist = (next: CustomMenuButton[]) => {
    setSettings({ customMenuButtons: next });
    syncActiveSceneSettings();
  };

  const addButton = () => {
    persist([...buttons, createCustomMenuButton()]);
  };

  const updateButton = (id: string, patch: Partial<CustomMenuButton>) => {
    persist(
      buttons.map((button) => {
        if (button.id !== id) return button;
        const next = { ...button, ...patch };
        if (
          patch.toggleEnabled !== undefined &&
          patch.toggleEnabled !== button.toggleEnabled
        ) {
          next.actions = migrateMenuButtonToggleHandles(
            button.actions,
            patch.toggleEnabled,
          );
          if (patch.toggleEnabled && !button.toggledIcon) {
            next.toggledIcon = button.icon;
          }
        }
        return next;
      }),
    );
  };

  const removeButton = (id: string) => {
    persist(buttons.filter((button) => button.id !== id));
  };

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Preview</FieldLabel>
        <p
          className="mb-2 text-[11px]"
          style={{ color: "var(--editor-muted)" }}
        >
          How the bottom menu looks in Preview, including General styles
        </p>
        <BottomMenuPreview buttons={buttons} styleVars={generalStyleToCssVars(generalStyle)} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <FieldLabel className="mb-0">Custom buttons</FieldLabel>
          <p className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Shown in Preview. Wire each one in Actions.
          </p>
        </div>
        <button
          type="button"
          className="editor-category-select-add"
          title="Add custom button"
          onClick={addButton}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {buttons.length === 0 ? (
        <p className="text-[11px]" style={{ color: "var(--editor-muted-2)" }}>
          No custom buttons yet.
        </p>
      ) : (
        <div className="space-y-2">
          {buttons.map((button) => (
            <div key={button.id} className="editor-custom-menu-item">
              <div className="editor-custom-menu-row">
                <CategoryIconPicker
                  compact
                  value={button.icon}
                  onChange={(icon) => updateButton(button.id, { icon })}
                />
                <input
                  className="editor-input min-w-0 flex-1"
                  type="text"
                  placeholder="Tooltip"
                  value={button.tooltip}
                  onChange={(e) =>
                    updateButton(button.id, { tooltip: e.target.value })
                  }
                />
                <Switch.Root
                  className="editor-switch"
                  checked={button.toggleEnabled}
                  title="Toggle button"
                  onCheckedChange={(checked) =>
                    updateButton(button.id, { toggleEnabled: checked })
                  }
                >
                  <Switch.Thumb className="editor-switch-thumb" />
                </Switch.Root>
                <IconButton
                  title="Remove button"
                  onClick={() => removeButton(button.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              {button.toggleEnabled ? (
                <div className="editor-custom-menu-row editor-custom-menu-row-toggled">
                  <CategoryIconPicker
                    compact
                    value={button.toggledIcon || button.icon}
                    onChange={(toggledIcon) =>
                      updateButton(button.id, { toggledIcon })
                    }
                  />
                  <span
                    className="min-w-0 flex-1 text-[11px]"
                    style={{ color: "var(--editor-muted)" }}
                  >
                    Toggled icon — shown while the button is on
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BottomMenuPreview({
  buttons,
  styleVars,
}: {
  buttons: CustomMenuButton[];
  styleVars: CSSProperties;
}) {
  return (
    <div
      className="editor-custom-menu-preview-wrap flex justify-center py-5"
      style={styleVars}
    >
      <div className="editor-viewport-controls editor-glass editor-panel-shadow flex flex-wrap items-center justify-center gap-1 rounded-xl px-2 py-2">
        <PreviewControl title="Reset view">
          <Home className="h-3.5 w-3.5" />
        </PreviewControl>
        <PreviewControl title="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </PreviewControl>
        <PreviewControl title="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </PreviewControl>
        {buttons.length > 0 ? (
          <div className="editor-vsep" style={{ height: 18 }} />
        ) : null}
        {buttons.map((button) => {
          const Icon = getCategoryLucideIcon(button.icon);
          return (
            <PreviewControl key={button.id} title={button.tooltip || "Custom button"}>
              <Icon className="h-3.5 w-3.5" />
            </PreviewControl>
          );
        })}
      </div>
    </div>
  );
}

function PreviewControl({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <button type="button" title={title} className="editor-tool-btn" tabIndex={-1}>
      {children}
    </button>
  );
}
