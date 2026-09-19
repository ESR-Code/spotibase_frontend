"use client";

import { useState } from "react";
import {
  ChevronDown,
  ListTree,
  Map,
  Palette,
  PanelBottom,
  PanelRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { DEFAULT_GENERAL_STYLE } from "@/lib/editor/constants/default-general-style";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  GENERAL_STYLE_GLOBAL_COLOR_FIELDS,
  GENERAL_STYLE_SURFACES,
  type GeneralStyleSurfaceId,
} from "@/lib/editor/types/general-style";

const SURFACE_ICONS: Record<
  GeneralStyleSurfaceId,
  typeof ListTree
> = {
  legendDrawer: ListTree,
  sceneExplorerDrawer: Map,
  hotspotDialog: PanelRight,
};

export function GeneralSettingsDrawer() {
  const open = useUIStore((s) => s.generalSettingsDrawerOpen);
  const setOpen = useUIStore((s) => s.setGeneralSettingsDrawerOpen);
  const style = useGeneralSettingsStore((s) => s.style);
  const setGlobalToken = useGeneralSettingsStore((s) => s.setGlobalToken);
  const setSurfaceColors = useGeneralSettingsStore((s) => s.setSurfaceColors);
  const setBottomMenuToken = useGeneralSettingsStore((s) => s.setBottomMenuToken);
  const resetStyle = useGeneralSettingsStore((s) => s.resetStyle);
  const sceneExplorerEnabled = useGeneralSettingsStore(
    (s) => s.sceneExplorerEnabled,
  );
  const setSceneExplorerEnabled = useGeneralSettingsStore(
    (s) => s.setSceneExplorerEnabled,
  );

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
          <div className="font-display text-[15px] font-bold">
            General Settings
          </div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Project-wide Preview styling — changes apply instantly
          </div>
        </div>
        <IconButton title="Close" onClick={() => setOpen(false)}>
          <X />
        </IconButton>
      </div>

      <div className="editor-settings-sections min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
        <SettingsSection
          title="Scene explorer"
          icon={<Map className="h-3.5 w-3.5" />}
        >
          <SwitchField
            label="Enable scene explorer"
            description="Show a Scene Explorer control in Preview to browse and switch scenes"
            checked={sceneExplorerEnabled}
            onChange={setSceneExplorerEnabled}
          />
        </SettingsSection>
        <SettingsSection
          title="Style"
          icon={<Palette className="h-3.5 w-3.5" />}
        >
          <StyleGroup
            title="General"
            description="Shared Preview chrome: accents, inputs, borders, and glass"
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          >
            {GENERAL_STYLE_GLOBAL_COLOR_FIELDS.map((field) => (
              <div key={field.key}>
                <FieldLabel>{field.label}</FieldLabel>
                <ColorSwatch
                  value={style[field.key]}
                  onChange={(value) => setGlobalToken(field.key, value)}
                  fallback={DEFAULT_GENERAL_STYLE[field.key]}
                />
                <p
                  className="mt-1.5 text-[11px]"
                  style={{ color: "var(--editor-muted)" }}
                >
                  {field.description}
                </p>
              </div>
            ))}

            <SwitchField
              label="Use borders"
              description="Show dividers and control borders in Preview panels"
              checked={style.bordersEnabled}
              onChange={(checked) => setGlobalToken("bordersEnabled", checked)}
            />
            {style.bordersEnabled ? (
              <div>
                <FieldLabel>Border color</FieldLabel>
                <ColorSwatch
                  value={style.borderColor}
                  onChange={(value) => setGlobalToken("borderColor", value)}
                  fallback={DEFAULT_GENERAL_STYLE.borderColor}
                />
              </div>
            ) : null}

            <SliderField
              label="Opacity"
              value={style.surfaceOpacity}
              display={`${Math.round(style.surfaceOpacity * 100)}%`}
              min={0.2}
              max={1}
              step={0.05}
              onChange={(value) => setGlobalToken("surfaceOpacity", value)}
            />
            <SliderField
              label="Background blur"
              value={style.surfaceBlur}
              display={`${style.surfaceBlur}px`}
              min={0}
              max={40}
              step={1}
              onChange={(value) => setGlobalToken("surfaceBlur", value)}
            />
          </StyleGroup>

          <StyleGroup
            title="Bottom menu"
            description="Viewport zoom / reset controls bar in Preview"
            icon={<PanelBottom className="h-3.5 w-3.5" />}
          >
            <div>
              <FieldLabel>Background color</FieldLabel>
              <ColorSwatch
                value={style.bottomMenu.backgroundColor}
                onChange={(value) =>
                  setBottomMenuToken("backgroundColor", value)
                }
                fallback={DEFAULT_GENERAL_STYLE.bottomMenu.backgroundColor}
              />
            </div>
            <div>
              <FieldLabel>Icon color</FieldLabel>
              <ColorSwatch
                value={style.bottomMenu.iconColor}
                onChange={(value) => setBottomMenuToken("iconColor", value)}
                fallback={DEFAULT_GENERAL_STYLE.bottomMenu.iconColor}
              />
            </div>
            <div>
              <FieldLabel>Stroke color</FieldLabel>
              <ColorSwatch
                value={style.bottomMenu.strokeColor}
                onChange={(value) => setBottomMenuToken("strokeColor", value)}
                fallback={DEFAULT_GENERAL_STYLE.bottomMenu.strokeColor}
              />
            </div>
            <SliderField
              label="Opacity"
              value={style.bottomMenu.opacity}
              display={`${Math.round(style.bottomMenu.opacity * 100)}%`}
              min={0.2}
              max={1}
              step={0.05}
              onChange={(value) => setBottomMenuToken("opacity", value)}
            />
            <SliderField
              label="Background blur"
              value={style.bottomMenu.blur}
              display={`${style.bottomMenu.blur}px`}
              min={0}
              max={40}
              step={1}
              onChange={(value) => setBottomMenuToken("blur", value)}
            />
          </StyleGroup>

          {GENERAL_STYLE_SURFACES.map((surface) => {
            const Icon = SURFACE_ICONS[surface.id];
            const tokens = style.surfaces[surface.id];
            return (
              <StyleGroup
                key={surface.id}
                title={surface.label}
                description={surface.description}
                icon={<Icon className="h-3.5 w-3.5" />}
              >
                <div>
                  <FieldLabel>Background color</FieldLabel>
                  <ColorSwatch
                    value={tokens.backgroundColor}
                    onChange={(backgroundColor) =>
                      setSurfaceColors(surface.id, { backgroundColor })
                    }
                    fallback={
                      DEFAULT_GENERAL_STYLE.surfaces[surface.id].backgroundColor
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Text color</FieldLabel>
                  <ColorSwatch
                    value={tokens.textColor}
                    onChange={(textColor) =>
                      setSurfaceColors(surface.id, { textColor })
                    }
                    fallback={DEFAULT_GENERAL_STYLE.surfaces[surface.id].textColor}
                  />
                </div>
                {surface.id === "hotspotDialog" ? (
                  <>
                    <SwitchField
                      label="Use stroke"
                      description="Show a border around the hotspot modal, drawer, or info box"
                      checked={tokens.strokeEnabled}
                      onChange={(strokeEnabled) =>
                        setSurfaceColors(surface.id, { strokeEnabled })
                      }
                    />
                    {tokens.strokeEnabled ? (
                      <div>
                        <FieldLabel>Stroke color</FieldLabel>
                        <ColorSwatch
                          value={tokens.strokeColor}
                          onChange={(strokeColor) =>
                            setSurfaceColors(surface.id, { strokeColor })
                          }
                          fallback={
                            DEFAULT_GENERAL_STYLE.surfaces[surface.id]
                              .strokeColor
                          }
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </StyleGroup>
            );
          })}
        </SettingsSection>
      </div>

      <div
        className="flex gap-2 p-4"
        style={{ borderTop: "1px solid var(--editor-line)" }}
      >
        <EditorButton className="flex-1" onClick={resetStyle}>
          Reset
        </EditorButton>
        <EditorButton
          variant="primary"
          className="flex-1"
          onClick={() => setOpen(false)}
        >
          Done
        </EditorButton>
      </div>
    </GlassPanel>
  );
}

function StyleGroup({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`editor-style-group ${open ? "open" : ""}`}>
      <button
        type="button"
        className="editor-style-group-head"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="editor-style-group-icon">{icon}</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[12px] font-semibold">{title}</span>
          <span
            className="mt-0.5 block text-[10.5px] font-normal leading-snug"
            style={{ color: "var(--editor-muted)" }}
          >
            {description}
          </span>
        </span>
        <ChevronDown className="editor-style-group-chevron h-3 w-3" />
      </button>
      {open ? (
        <div className="editor-style-group-body space-y-3">{children}</div>
      ) : null}
    </div>
  );
}

function ColorSwatch({
  value,
  onChange,
  fallback,
}: {
  value: string;
  onChange: (value: string) => void;
  fallback: string;
}) {
  return (
    <input
      type="color"
      className="h-8 w-full cursor-pointer rounded"
      value={normalizeHex(value) || fallback}
      onChange={(e) => onChange(e.target.value)}
      title={value}
    />
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

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "";
}
