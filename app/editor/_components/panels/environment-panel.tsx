"use client";

import { LayoutGrid, Moon, Square, Sun, X } from "lucide-react";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { useEnvironmentForm } from "@/lib/editor/forms/use-environment-form";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function EnvironmentPanel() {
  const open = useUIStore((s) => s.environmentPanelOpen);
  const setOpen = useUIStore((s) => s.setEnvironmentPanelOpen);
  const { form } = useEnvironmentForm();
  const values = form.watch();

  const gridColor = useSettingsStore((s) => s.gridColor);
  const gridOpacity = useSettingsStore((s) => s.gridOpacity);
  const setSettings = useSettingsStore((s) => s.setSettings);

  if (!open) return null;

  return (
    <GlassPanel className="absolute bottom-20 right-4 z-20 flex max-h-[70vh] w-[280px] flex-col overflow-hidden rounded-xl">
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--editor-panel)",
          borderBottom: "1px solid var(--editor-line-soft)",
        }}
      >
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--editor-muted)" }}
          >
            Environment & Lighting
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--editor-muted-2)" }}>
            Live preview — changes apply instantly
          </div>
        </div>
        <IconButton title="Close" onClick={() => setOpen(false)}>
          <X />
        </IconButton>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <section>
          <FieldLabel>Background Mode</FieldLabel>
          <div className="mb-3 flex gap-2">
            <TypePill
              active={values.bgMode === "grid"}
              onClick={() => form.setValue("bgMode", "grid")}
            >
              <LayoutGrid className="mr-1 inline h-3 w-3" />
              Grid
            </TypePill>
            <TypePill
              active={values.bgMode === "color"}
              onClick={() => form.setValue("bgMode", "color")}
            >
              <Square className="mr-1 inline h-3 w-3" />
              Color
            </TypePill>
          </div>
          <FieldLabel>Color</FieldLabel>
          <input
            type="color"
            className="h-8 w-full rounded"
            value={values.bgColor}
            onChange={(e) => form.setValue("bgColor", e.target.value)}
          />
        </section>

        <section
          className="pt-3"
          style={{ borderTop: "1px solid var(--editor-line-soft)" }}
        >
          <FieldLabel>3D Grid Plane</FieldLabel>
          <label className="mb-3 flex items-center justify-between text-[12px]">
            <span>Show Ground Grid</span>
            <input
              type="checkbox"
              checked={values.show3dGrid}
              onChange={(e) => form.setValue("show3dGrid", e.target.checked)}
            />
          </label>
          <FieldLabel>Grid Color</FieldLabel>
          <input
            type="color"
            className="mb-3 h-8 w-full rounded"
            value={gridColor}
            onChange={(e) => setSettings({ gridColor: e.target.value })}
          />
          <FieldLabel className="flex justify-between">
            <span>Grid Opacity</span>
            <span>{gridOpacity.toFixed(2)}</span>
          </FieldLabel>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={gridOpacity}
            onChange={(e) =>
              setSettings({ gridOpacity: parseFloat(e.target.value) })
            }
          />
        </section>

        <section
          className="pt-3"
          style={{ borderTop: "1px solid var(--editor-line-soft)" }}
        >
          <FieldLabel className="flex items-center gap-1.5">
            <Moon className="h-3 w-3" style={{ color: "var(--editor-muted)" }} />
            Shadows
          </FieldLabel>
          <FieldLabel className="flex justify-between">
            <span>Intensity</span>
            <span>{values.shadowIntensity.toFixed(2)}</span>
          </FieldLabel>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={values.shadowIntensity}
            onChange={(e) =>
              form.setValue("shadowIntensity", parseFloat(e.target.value))
            }
          />
          <FieldLabel className="mt-2">Color</FieldLabel>
          <input
            type="color"
            className="h-8 w-full rounded"
            value={values.shadowColor}
            onChange={(e) => form.setValue("shadowColor", e.target.value)}
          />
        </section>

        <section
          className="pt-3"
          style={{ borderTop: "1px solid var(--editor-line-soft)" }}
        >
          <FieldLabel className="flex items-center gap-1.5">
            <Sun className="h-3 w-3" style={{ color: "var(--editor-crimson-2)" }} />
            Key Light
          </FieldLabel>
          <FieldLabel className="flex justify-between">
            <span>Brightness</span>
            <span>{values.keyIntensity.toFixed(2)}</span>
          </FieldLabel>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={values.keyIntensity}
            onChange={(e) =>
              form.setValue("keyIntensity", parseFloat(e.target.value))
            }
          />
          <FieldLabel className="mt-2">Color</FieldLabel>
          <input
            type="color"
            className="h-8 w-full rounded"
            value={values.keyColor}
            onChange={(e) => form.setValue("keyColor", e.target.value)}
          />
        </section>

        <section
          className="pt-3"
          style={{ borderTop: "1px solid var(--editor-line-soft)" }}
        >
          <FieldLabel>Ambient / Fill Light</FieldLabel>
          <FieldLabel className="flex justify-between">
            <span>Brightness</span>
            <span>{values.fillIntensity.toFixed(2)}</span>
          </FieldLabel>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={values.fillIntensity}
            onChange={(e) =>
              form.setValue("fillIntensity", parseFloat(e.target.value))
            }
          />
          <FieldLabel className="mt-2">Color</FieldLabel>
          <input
            type="color"
            className="mb-2 h-8 w-full rounded"
            value={values.fillColor}
            onChange={(e) => form.setValue("fillColor", e.target.value)}
          />
          <FieldLabel className="flex justify-between">
            <span>Rotate X (Pitch)</span>
            <span>{values.fillPitch}°</span>
          </FieldLabel>
          <input
            type="range"
            min={-90}
            max={90}
            step={5}
            value={values.fillPitch}
            onChange={(e) =>
              form.setValue("fillPitch", parseFloat(e.target.value))
            }
          />
          <FieldLabel className="mt-2 flex justify-between">
            <span>Rotate Y (Yaw)</span>
            <span>{values.fillYaw}°</span>
          </FieldLabel>
          <input
            type="range"
            min={-180}
            max={180}
            step={5}
            value={values.fillYaw}
            onChange={(e) => form.setValue("fillYaw", parseFloat(e.target.value))}
          />
        </section>
      </div>
    </GlassPanel>
  );
}
