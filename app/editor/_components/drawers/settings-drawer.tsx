"use client";

import { useState } from "react";
import {
  Camera,
  ChevronDown,
  LayoutGrid,
  MapPin,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useEnvironmentForm } from "@/lib/editor/forms/use-environment-form";
import { useSettingsForm } from "@/lib/editor/forms/use-settings-form";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsDrawerOpen);
  const setOpen = useUIStore((s) => s.setSettingsDrawerOpen);
  const { form, reset: resetSettings } = useSettingsForm();
  const { form: envForm, reset: resetEnvironment } = useEnvironmentForm();
  const values = form.watch();
  const env = envForm.watch();

  const resetAll = () => {
    resetSettings();
    resetEnvironment();
  };

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

      <div className="editor-settings-sections min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
        <SettingsSection title="Hotspots" icon={<MapPin className="h-3.5 w-3.5" />}>
          <SliderField
            label="Hotspot Size"
            value={values.hotspotSize}
            display={`${values.hotspotSize.toFixed(2)}×`}
            min={0.3}
            max={2.5}
            step={0.05}
            onChange={(v) => form.setValue("hotspotSize", v)}
          />
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Scales dynamic marker sizing while zooming.
          </p>
        </SettingsSection>

        <SettingsSection title="Camera" icon={<Camera className="h-3.5 w-3.5" />}>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--editor-muted-2)" }}>
            Zoom Limits
          </div>
          <SliderField
            label="Max Zoom (closest)"
            value={values.minDistance}
            display={values.minDistance.toFixed(1)}
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

          <div
            className="mb-1 mt-3 pt-3 text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: "var(--editor-muted-2)",
              borderTop: "1px solid var(--editor-line-soft)",
            }}
          >
            Orbit Yaw
          </div>
          <SliderField
            label="Min Yaw"
            value={values.minYaw}
            display={`${values.minYaw}°`}
            min={-180}
            max={180}
            step={5}
            onChange={(v) => form.setValue("minYaw", v)}
          />
          <SliderField
            label="Max Yaw"
            value={values.maxYaw}
            display={`${values.maxYaw}°`}
            min={-180}
            max={180}
            step={5}
            onChange={(v) => form.setValue("maxYaw", v)}
          />

          <div
            className="mb-1 mt-3 pt-3 text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: "var(--editor-muted-2)",
              borderTop: "1px solid var(--editor-line-soft)",
            }}
          >
            Orbit Pitch
          </div>
          <SliderField
            label="Min Pitch"
            value={values.minPitch}
            display={`${values.minPitch}°`}
            min={0}
            max={180}
            step={1}
            onChange={(v) => form.setValue("minPitch", v)}
          />
          <SliderField
            label="Max Pitch"
            value={values.maxPitch}
            display={`${values.maxPitch}°`}
            min={0}
            max={180}
            step={1}
            onChange={(v) => form.setValue("maxPitch", v)}
          />
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Pitch: 0° top-down, 90° horizon, 180° underside.
          </p>
        </SettingsSection>

        <SettingsSection title="Grid" icon={<LayoutGrid className="h-3.5 w-3.5" />}>
          <label className="mb-3 flex items-center justify-between text-[12px]">
            <span>Show Ground Grid</span>
            <input
              type="checkbox"
              checked={env.show3dGrid}
              onChange={(e) => envForm.setValue("show3dGrid", e.target.checked)}
            />
          </label>
          <FieldLabel>Grid Color</FieldLabel>
          <input
            type="color"
            className="mb-3 h-8 w-full rounded"
            value={values.gridColor}
            onChange={(e) => form.setValue("gridColor", e.target.value)}
          />
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
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Overall ground grid extent. Outer edges still fade out.
          </p>
        </SettingsSection>

        <SettingsSection title="Environment & Lighting" icon={<Sun className="h-3.5 w-3.5" />}>
          <div>
            <FieldLabel>Environment Color</FieldLabel>
            <input
              type="color"
              className="h-8 w-full rounded"
              value={env.bgColor}
              onChange={(e) => envForm.setValue("bgColor", e.target.value)}
            />
          </div>

          <div
            className="pt-3"
            style={{ borderTop: "1px solid var(--editor-line-soft)" }}
          >
            <FieldLabel className="flex items-center gap-1.5">
              <Moon className="h-3 w-3" style={{ color: "var(--editor-muted)" }} />
              Shadows
            </FieldLabel>
            <SliderField
              label="Intensity"
              value={env.shadowIntensity}
              display={env.shadowIntensity.toFixed(2)}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => envForm.setValue("shadowIntensity", v)}
            />
            <FieldLabel className="mt-2">Color</FieldLabel>
            <input
              type="color"
              className="h-8 w-full rounded"
              value={env.shadowColor}
              onChange={(e) => envForm.setValue("shadowColor", e.target.value)}
            />
          </div>

          <div
            className="pt-3"
            style={{ borderTop: "1px solid var(--editor-line-soft)" }}
          >
            <FieldLabel className="flex items-center gap-1.5">
              <Sun className="h-3 w-3" style={{ color: "var(--editor-crimson-2)" }} />
              Key Light
            </FieldLabel>
            <SliderField
              label="Brightness"
              value={env.keyIntensity}
              display={env.keyIntensity.toFixed(2)}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => envForm.setValue("keyIntensity", v)}
            />
            <FieldLabel className="mt-2">Color</FieldLabel>
            <input
              type="color"
              className="h-8 w-full rounded"
              value={env.keyColor}
              onChange={(e) => envForm.setValue("keyColor", e.target.value)}
            />
          </div>

          <div
            className="pt-3"
            style={{ borderTop: "1px solid var(--editor-line-soft)" }}
          >
            <FieldLabel>Ambient / Fill Light</FieldLabel>
            <SliderField
              label="Brightness"
              value={env.fillIntensity}
              display={env.fillIntensity.toFixed(2)}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => envForm.setValue("fillIntensity", v)}
            />
            <FieldLabel className="mt-2">Color</FieldLabel>
            <input
              type="color"
              className="mb-2 h-8 w-full rounded"
              value={env.fillColor}
              onChange={(e) => envForm.setValue("fillColor", e.target.value)}
            />
            <SliderField
              label="Rotate X (Pitch)"
              value={env.fillPitch}
              display={`${env.fillPitch}°`}
              min={-90}
              max={90}
              step={5}
              onChange={(v) => envForm.setValue("fillPitch", v)}
            />
            <SliderField
              label="Rotate Y (Yaw)"
              value={env.fillYaw}
              display={`${env.fillYaw}°`}
              min={-180}
              max={180}
              step={5}
              onChange={(v) => envForm.setValue("fillYaw", v)}
            />
          </div>
        </SettingsSection>
      </div>

      <div
        className="flex gap-2 p-4"
        style={{ borderTop: "1px solid var(--editor-line)" }}
      >
        <EditorButton className="flex-1" onClick={resetAll}>
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
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`editor-settings-section ${open ? "open" : ""}`}>
      <button
        type="button"
        className="editor-settings-section-head"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="editor-settings-sec-icon">{icon}</span>
        {title}
        <ChevronDown className="editor-settings-sec-chevron h-3 w-3" />
      </button>
      {open ? <div className="editor-settings-section-body space-y-3">{children}</div> : null}
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
