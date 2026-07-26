"use client";

import { X } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useSettingsForm } from "@/lib/editor/forms/use-settings-form";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsDrawerOpen);
  const setOpen = useUIStore((s) => s.setSettingsDrawerOpen);
  const { form, reset } = useSettingsForm();
  const values = form.watch();

  return (
    <GlassPanel
      className={`editor-drawer editor-settings-drawer flex flex-col ${open ? "open" : ""}`}
      style={{ borderLeft: "1px solid var(--editor-line)" }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--editor-line)" }}
      >
        <div>
          <div className="font-display text-[15px] font-bold">General Settings</div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Live preview — changes apply instantly
          </div>
        </div>
        <IconButton title="Close" onClick={() => setOpen(false)}>
          <X />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <SettingsSection title="Hotspots">
          <SliderField
            label="Hotspot Size"
            value={values.hotspotSize}
            display={`${values.hotspotSize.toFixed(2)}×`}
            min={0.3}
            max={2.5}
            step={0.05}
            onChange={(v) => form.setValue("hotspotSize", v)}
          />
        </SettingsSection>

        <SettingsSection title="Camera">
          <SliderField
            label="Max Zoom (closest)"
            value={values.minDistance}
            display={String(values.minDistance)}
            min={0.2}
            max={20}
            step={0.1}
            onChange={(v) => form.setValue("minDistance", v)}
          />
          <SliderField
            label="Min Zoom (farthest)"
            value={values.maxDistance}
            display={String(values.maxDistance)}
            min={5}
            max={120}
            step={1}
            onChange={(v) => form.setValue("maxDistance", v)}
          />
        </SettingsSection>

        <SettingsSection title="Grid">
          <SliderField
            label="Opacity"
            value={values.gridOpacity}
            display={values.gridOpacity.toFixed(2)}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(v) => form.setValue("gridOpacity", v)}
          />
          <SliderField
            label="Size"
            value={values.gridSize}
            display={String(values.gridSize)}
            min={16}
            max={80}
            step={2}
            onChange={(v) => form.setValue("gridSize", v)}
          />
        </SettingsSection>
      </div>

      <div
        className="flex gap-2 p-4"
        style={{ borderTop: "1px solid var(--editor-line)" }}
      >
        <EditorButton className="flex-1" onClick={reset}>
          Reset
        </EditorButton>
        <EditorButton variant="primary" className="flex-1" onClick={() => setOpen(false)}>
          Done
        </EditorButton>
      </div>
    </GlassPanel>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="editor-settings-section open">
      <div className="editor-settings-section-head px-3 py-3 font-display text-xs font-bold uppercase">
        {title}
      </div>
      <div className="space-y-3 px-3 pb-3">{children}</div>
    </div>
  );
}

function SliderField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <FieldLabel className="flex justify-between">
        <span>{label}</span>
        <span>{display}</span>
      </FieldLabel>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
