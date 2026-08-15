"use client";

import { useState } from "react";
import {
  Camera,
  ChevronDown,
  Globe,
  ImageIcon,
  Info,
  LayoutGrid,
  ListTree,
  MapPin,
  Moon,
  Palette,
  PanelRight,
  Sparkles,
  Square,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { GeoDetailsSection } from "@/app/editor/_components/drawers/geo-details-section";
import { MapStyleSection } from "@/app/editor/_components/drawers/map-style-section";
import { CameraPoseCaptureField } from "@/app/editor/_components/ui/camera-pose-capture-field";
import { CheckboxField } from "@/app/editor/_components/ui/checkbox-field";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { useEffectsForm } from "@/lib/editor/forms/use-effects-form";
import { useEnvironmentForm } from "@/lib/editor/forms/use-environment-form";
import { useGeoForm } from "@/lib/editor/forms/use-geo-form";
import { useSettingsForm } from "@/lib/editor/forms/use-settings-form";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import type {
  MarkerDialogPresentation,
  MarkerDialogSize,
} from "@/lib/editor/types/editor-settings";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import {
  syncActiveSceneSettings,
  useActiveScene,
} from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

const MARKER_DIALOG_MODES: {
  id: MarkerDialogPresentation;
  label: string;
  icon: typeof PanelRight;
}[] = [
  { id: "drawer", label: "Drawer", icon: PanelRight },
  { id: "modal", label: "Modal", icon: Square },
  { id: "infobox", label: "Info box", icon: Info },
];

const MARKER_DIALOG_SIZES: {
  id: MarkerDialogSize;
  label: string;
}[] = [
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
  { id: "fullscreen", label: "Full screen" },
];

export function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsDrawerOpen);
  const setOpen = useUIStore((s) => s.setSettingsDrawerOpen);
  const { form, reset: resetSettings } = useSettingsForm();
  const { form: envForm, reset: resetEnvironment } = useEnvironmentForm();
  const { form: effectsForm, reset: resetEffects } = useEffectsForm();
  const { reset: resetGeo } = useGeoForm();
  const values = form.watch();
  const env = envForm.watch();
  const effects = effectsForm.watch();
  const scene = useActiveScene();
  const sections = getSceneType(scene.type).settingsSections;
  const isGeoScene = scene.type === "geo";
  const isModelScene = scene.type === "model";
  const resetPosition = useSettingsStore((s) => s.resetPosition);
  const setSettings = useSettingsStore((s) => s.setSettings);

  const resetAll = () => {
    resetSettings();
    resetEnvironment();
    resetEffects();
    resetGeo();
  };

  const clearResetPosition = () => {
    setSettings({ resetPosition: null });
    syncActiveSceneSettings();
    toast.success("Reset view position cleared");
  };

  const setResetPosition = () => {
    window.dispatchEvent(new Event("editor:set-reset-position"));
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
          <div className="font-display text-[15px] font-bold">Scene Settings</div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Applies to the current scene — changes apply instantly
          </div>
        </div>
        <IconButton title="Close" onClick={() => setOpen(false)}>
          <X />
        </IconButton>
      </div>

      <div className="editor-settings-sections min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
        {sections.geoDetails ? (
          <SettingsSection
            title="Geo details"
            icon={<Globe className="h-3.5 w-3.5" />}
            defaultOpen
          >
            <GeoDetailsSection />
          </SettingsSection>
        ) : null}

        {sections.mapStyle ? (
          <SettingsSection
            title="Map style"
            icon={<Palette className="h-3.5 w-3.5" />}
          >
            <MapStyleSection />
          </SettingsSection>
        ) : null}

        <SettingsSection title="Logo" icon={<ImageIcon className="h-3.5 w-3.5" />}>
          <HotspotImageField
            layout="split"
            value={values.logoUrl ?? ""}
            onChange={(dataUrl) => form.setValue("logoUrl", dataUrl)}
            uploadLabel="Upload logo"
            emptyLabel="No logo"
            hint="Shown at the top center of the viewport. PNG / JPG / WebP / SVG, up to 2.5 MB."
            clearTitle="Remove logo"
            successMessage="Logo applied"
            sizeErrorMessage="Logo must be under 2.5 MB"
          />
          {values.logoUrl ? (
            <SliderField
              label="Logo scale"
              value={values.logoScale}
              display={`${values.logoScale.toFixed(2)}×`}
              min={0.4}
              max={2.5}
              step={0.05}
              onChange={(v) => form.setValue("logoScale", v)}
            />
          ) : null}
        </SettingsSection>

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
          <CheckboxField
            label="Show label on select"
            description="Keep the title label visible after clicking a hotspot in Preview"
            checked={values.previewShowLabelOnSelect}
            onChange={(checked) =>
              form.setValue("previewShowLabelOnSelect", checked)
            }
          />

          <div
            className="pt-2"
            style={{ borderTop: "1px solid var(--editor-line-soft)" }}
          >
            <div
              className="mb-2.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Label Appearance
            </div>
            <FieldLabel>Label Color</FieldLabel>
            <input
              type="color"
              className="mb-3 h-8 w-full rounded"
              value={values.hotspotLabelColor}
              onChange={(e) => form.setValue("hotspotLabelColor", e.target.value)}
            />
            <FieldLabel>Text Color</FieldLabel>
            <input
              type="color"
              className="mb-3 h-8 w-full rounded"
              value={values.hotspotLabelTextColor}
              onChange={(e) =>
                form.setValue("hotspotLabelTextColor", e.target.value)
              }
            />
            <FieldLabel>Border Color</FieldLabel>
            <input
              type="color"
              className="h-8 w-full rounded"
              value={values.hotspotLabelBorderColor}
              onChange={(e) =>
                form.setValue("hotspotLabelBorderColor", e.target.value)
              }
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Marker Dialog"
          icon={<PanelRight className="h-3.5 w-3.5" />}
        >
          <div>
            <FieldLabel>Presentation</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {MARKER_DIALOG_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <TypePill
                    key={mode.id}
                    active={values.markerDialogPresentation === mode.id}
                    onClick={() => {
                      form.setValue("markerDialogPresentation", mode.id);
                      if (mode.id === "infobox") {
                        if (values.markerDialogSize === "fullscreen") {
                          form.setValue("markerDialogSize", "medium");
                        }
                        form.setValue("markerDialogBackdrop", false);
                        form.setValue("markerDialogBackdropBlur", false);
                      }
                    }}
                  >
                    <Icon className="mr-1 inline h-3 w-3" />
                    {mode.label}
                  </TypePill>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
              How hotspot details open in Preview. Info box anchors a compact card above the marker.
            </p>
          </div>

          <div>
            <FieldLabel>Size</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {MARKER_DIALOG_SIZES.map((size) => (
                <TypePill
                  key={size.id}
                  active={values.markerDialogSize === size.id}
                  disabled={
                    values.markerDialogPresentation === "infobox" &&
                    size.id === "fullscreen"
                  }
                  onClick={() => form.setValue("markerDialogSize", size.id)}
                >
                  {size.label}
                </TypePill>
              ))}
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
              Desktop width for drawer, modal, and info box. Full screen is unavailable for info box.
            </p>
          </div>

          <CheckboxField
            label="Show backdrop"
            description="Dim the viewport behind the dialog"
            checked={values.markerDialogBackdrop}
            disabled={values.markerDialogPresentation === "infobox"}
            onChange={(checked) => {
              form.setValue("markerDialogBackdrop", checked);
              if (!checked) form.setValue("markerDialogBackdropBlur", false);
            }}
          />
          <CheckboxField
            label="Blur backdrop"
            description="Soft-focus the scene through the overlay"
            checked={values.markerDialogBackdropBlur}
            disabled={
              values.markerDialogPresentation === "infobox" ||
              !values.markerDialogBackdrop
            }
            onChange={(checked) =>
              form.setValue("markerDialogBackdropBlur", checked)
            }
          />
          <CheckboxField
            label="Reset camera on close"
            description="Return to the home view when the marker dialog closes"
            checked={values.markerDialogResetCameraOnClose}
            onChange={(checked) =>
              form.setValue("markerDialogResetCameraOnClose", checked)
            }
          />
        </SettingsSection>

        <SettingsSection title="Camera" icon={<Camera className="h-3.5 w-3.5" />}>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--editor-muted-2)" }}>
            Reset View
          </div>
          <CameraPoseCaptureField
            previewUrl={resetPosition?.previewUrl}
            captureLabel="Set reset position"
            emptyLabel="No reset position"
            hint={
              isGeoScene
                ? "Per scene — saves the current map view as this scene's Reset view home. If unset, Reset view uses Geo details (or the globe)."
                : "Per scene — saves the current camera as this scene's Reset view home. If unset, Reset view frames the model."
            }
            previewAlt="Reset view preview"
            onCapture={setResetPosition}
            onClear={clearResetPosition}
          />

          <div
            className="mb-1 mt-3 pt-3 text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: "var(--editor-muted-2)",
              borderTop: "1px solid var(--editor-line-soft)",
            }}
          >
            Zoom Limits
          </div>
          {isGeoScene ? (
            <>
              <SliderField
                label="Min zoom (farthest)"
                value={values.minZoom}
                display={values.minZoom.toFixed(1)}
                min={0}
                max={22}
                step={0.1}
                onChange={(v) => form.setValue("minZoom", Math.min(v, values.maxZoom))}
              />
              <SliderField
                label="Max zoom (closest)"
                value={values.maxZoom}
                display={values.maxZoom.toFixed(1)}
                min={0}
                max={22}
                step={0.1}
                onChange={(v) => form.setValue("maxZoom", Math.max(v, values.minZoom))}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </SettingsSection>

        {sections.grid ? (
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
        ) : null}

        <SettingsSection title="Legend" icon={<ListTree className="h-3.5 w-3.5" />}>
          <SwitchField
            label="Enable legend"
            description="Show a Legend control in Preview to browse hotspots by category"
            checked={values.legendEnabled}
            onChange={(checked) => form.setValue("legendEnabled", checked)}
          />
        </SettingsSection>

        {sections.effects ? (
          <SettingsSection title="Effects" icon={<Sparkles className="h-3.5 w-3.5" />}>
            <EnvGroup title="Ambient Occlusion" icon={<Moon className="h-3 w-3" />}>
              <SwitchField
                label="Enable AO"
                description="Screen-space ambient occlusion softens crevices and contact areas"
                checked={effects.aoEnabled}
                onChange={(checked) => effectsForm.setValue("aoEnabled", checked)}
              />
              {effects.aoEnabled ? (
                <>
                  <SliderField
                    label="Intensity"
                    value={effects.aoIntensity}
                    display={effects.aoIntensity.toFixed(2)}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => effectsForm.setValue("aoIntensity", v)}
                  />
                  <SliderField
                    label="Radius"
                    value={effects.aoRadius}
                    display={effects.aoRadius.toFixed(0)}
                    min={1}
                    max={100}
                    step={1}
                    onChange={(v) => effectsForm.setValue("aoRadius", v)}
                  />
                  <SliderField
                    label="Samples"
                    value={effects.aoSamples}
                    display={String(Math.round(effects.aoSamples))}
                    min={4}
                    max={32}
                    step={1}
                    onChange={(v) =>
                      effectsForm.setValue("aoSamples", Math.round(v))
                    }
                  />
                  <SliderField
                    label="Power"
                    value={effects.aoPower}
                    display={effects.aoPower.toFixed(1)}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onChange={(v) => effectsForm.setValue("aoPower", v)}
                  />
                  <SwitchField
                    label="Blur"
                    description="Softens AO noise for a cleaner look"
                    checked={effects.aoBlurEnabled}
                    onChange={(checked) =>
                      effectsForm.setValue("aoBlurEnabled", checked)
                    }
                  />
                </>
              ) : null}
            </EnvGroup>
          </SettingsSection>
        ) : null}

        {sections.environment ? (
        <SettingsSection
          title={isModelScene ? "Environment & Lighting" : "Environment"}
          icon={<Sun className="h-3.5 w-3.5" />}
        >
          <EnvGroup
            title="Environment"
            icon={<LayoutGrid className="h-3 w-3" />}
          >
            <FieldLabel>Background Color</FieldLabel>
            <input
              type="color"
              className="h-8 w-full rounded"
              value={env.bgColor}
              onChange={(e) => envForm.setValue("bgColor", e.target.value)}
            />
          </EnvGroup>

          {isModelScene ? (
            <>
              <EnvGroup
                title="Shadows"
                icon={<Moon className="h-3 w-3" />}
              >
                <div className="editor-env-inline-row">
                  <div className="editor-env-inline-slider">
                    <SliderField
                      label="Intensity"
                      value={env.shadowIntensity}
                      display={env.shadowIntensity.toFixed(2)}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(v) => envForm.setValue("shadowIntensity", v)}
                    />
                  </div>
                  <ColorSwatch
                    label="Color"
                    value={env.shadowColor}
                    onChange={(v) => envForm.setValue("shadowColor", v)}
                  />
                </div>
              </EnvGroup>

              <EnvGroup
                title="Key Light"
                icon={<Sun className="h-3 w-3" />}
              >
                <div className="editor-env-inline-row">
                  <div className="editor-env-inline-slider">
                    <SliderField
                      label="Brightness"
                      value={env.keyIntensity}
                      display={env.keyIntensity.toFixed(2)}
                      min={0}
                      max={5}
                      step={0.1}
                      onChange={(v) => envForm.setValue("keyIntensity", v)}
                    />
                  </div>
                  <ColorSwatch
                    label="Color"
                    value={env.keyColor}
                    onChange={(v) => envForm.setValue("keyColor", v)}
                  />
                </div>
                <SliderField
                  label="Rotate X (Pitch)"
                  value={env.keyPitch}
                  display={`${env.keyPitch}°`}
                  min={-90}
                  max={90}
                  step={5}
                  onChange={(v) => envForm.setValue("keyPitch", v)}
                />
                <SliderField
                  label="Rotate Y (Yaw)"
                  value={env.keyYaw}
                  display={`${env.keyYaw}°`}
                  min={-180}
                  max={180}
                  step={5}
                  onChange={(v) => envForm.setValue("keyYaw", v)}
                />
              </EnvGroup>

              <EnvGroup title="Ambient / Fill Light">
                <div className="editor-env-inline-row">
                  <div className="editor-env-inline-slider">
                    <SliderField
                      label="Brightness"
                      value={env.fillIntensity}
                      display={env.fillIntensity.toFixed(2)}
                      min={0}
                      max={5}
                      step={0.1}
                      onChange={(v) => envForm.setValue("fillIntensity", v)}
                    />
                  </div>
                  <ColorSwatch
                    label="Color"
                    value={env.fillColor}
                    onChange={(v) => envForm.setValue("fillColor", v)}
                  />
                </div>
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
              </EnvGroup>
            </>
          ) : null}
        </SettingsSection>
        ) : null}
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
      {open ? (
        <div className="editor-settings-section-body space-y-2.5">{children}</div>
      ) : null}
    </div>
  );
}

function EnvGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="editor-env-group">
      <div className="editor-env-group-head">
        {icon ? <span className="editor-env-group-icon">{icon}</span> : null}
        <span>{title}</span>
      </div>
      <div className="editor-env-group-body space-y-2.5">{children}</div>
    </div>
  );
}

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="editor-env-swatch">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="color"
        className="editor-env-swatch-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={value}
      />
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
