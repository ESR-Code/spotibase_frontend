"use client";

import { ImageIcon, ListTree, MapPin, Move3D, Type } from "lucide-react";
import { useRef } from "react";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { HotspotMarkerImageField } from "@/app/editor/_components/drawers/hotspot-marker-image-field";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { CategorySelect } from "@/app/editor/_components/ui/category-select";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import { spawnUsesLatLon } from "@/lib/editor/actions/spawn-hotspots";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { markerColorSwatches } from "@/lib/editor/theme/tokens";
import type { SpawnHotspotTemplate } from "@/lib/editor/types/hotspot-action";
import type { SpawnCoordMode } from "@/lib/editor/types/hotspot-action";
import { HOTSPOT_SHAPES } from "@/lib/editor/types/hotspot";

type SpawnHotspotGeneralTabProps = {
  template: SpawnHotspotTemplate;
  coordMode: SpawnCoordMode;
  fieldSources: HttpFieldSource[];
  onChange: (patch: Partial<SpawnHotspotTemplate>) => void;
};

function TokenInput({
  value,
  placeholder,
  sources,
  onChange,
}: {
  value: string;
  placeholder?: string;
  sources: HttpFieldSource[];
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        className="editor-input min-w-0 flex-1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <VariableInsertButton
        sources={sources}
        onInsert={(token) => {
          onChange(
            insertTextAt(
              value,
              token,
              ref.current?.selectionStart ?? value.length,
              ref.current?.selectionEnd ?? value.length,
            ),
          );
        }}
      />
    </div>
  );
}

export function SpawnHotspotGeneralTab({
  template,
  coordMode,
  fieldSources,
  onChange,
}: SpawnHotspotGeneralTabProps) {
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const legendCategories = useSettingsStore((s) => s.legendCategories);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const isCustomColor = !markerColorSwatches.includes(
    template.color as (typeof markerColorSwatches)[number],
  );
  const latLon = spawnUsesLatLon(coordMode);

  return (
    <div className="editor-general-tab space-y-2.5">
      <SettingsSection
        title="Title"
        icon={<Type className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <div>
          <FieldLabel>Title</FieldLabel>
          <TokenInput
            value={template.title}
            placeholder="{{title}}"
            sources={fieldSources}
            onChange={(title) => onChange({ title })}
          />
        </div>
        <div>
          <FieldLabel>Legend name</FieldLabel>
          <TokenInput
            value={template.legendName}
            placeholder="Optional"
            sources={fieldSources}
            onChange={(legendName) => onChange({ legendName })}
          />
        </div>
      </SettingsSection>

      {legendEnabled ? (
        <SettingsSection
          title="Legend"
          icon={<ListTree className="h-3.5 w-3.5" />}
        >
          <CategorySelect
            value={template.category}
            categories={legendCategories}
            allowClear
            onChange={(category) => onChange({ category })}
            onCategoriesChange={(categories) =>
              setSettings({ legendCategories: categories })
            }
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Marker" icon={<MapPin className="h-3.5 w-3.5" />}>
        <div>
          <FieldLabel>Type</FieldLabel>
          <div className="editor-pill-row">
            {(["none", "info", "warning", "spec", "link"] as const).map(
              (type) => (
                <TypePill
                  key={type}
                  active={template.type === type}
                  onClick={() => onChange({ type })}
                >
                  {type}
                </TypePill>
              ),
            )}
          </div>
        </div>

        <div>
          <FieldLabel>Style</FieldLabel>
          <div className="editor-pill-row">
            {(["dot", "number", "icon", "image", "hidden"] as const).map(
              (style) => (
                <TypePill
                  key={style}
                  active={template.style === style}
                  onClick={() => onChange({ style })}
                >
                  {style}
                </TypePill>
              ),
            )}
          </div>
          {template.style === "number" ? (
            <div className="mt-2">
              <TokenInput
                value={template.number}
                placeholder="{{id}}"
                sources={fieldSources}
                onChange={(number) => onChange({ number })}
              />
            </div>
          ) : null}
          {template.style === "icon" ? (
            <div className="mt-2">
              <CategoryIconPicker
                value={template.icon || "Info"}
                color={template.color}
                onChange={(icon) => onChange({ icon })}
              />
            </div>
          ) : null}
          {template.style === "image" ? (
            <HotspotMarkerImageField
              value={template.markerImage}
              onChange={(markerImage) => onChange({ markerImage, style: "image" })}
            />
          ) : null}
        </div>

        <div>
          <FieldLabel>Shape</FieldLabel>
          <div className="editor-pill-row">
            {HOTSPOT_SHAPES.map((shape) => (
              <TypePill
                key={shape}
                active={template.shape === shape}
                onClick={() => onChange({ shape })}
              >
                {shape}
              </TypePill>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Color</FieldLabel>
          <div className="editor-swatch-row">
            {markerColorSwatches.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={template.color === color}
                onClick={() => onChange({ color })}
              />
            ))}
            <label
              className={`editor-swatch editor-swatch-custom ${isCustomColor ? "selected" : ""}`}
              title="Custom color"
              style={isCustomColor ? { background: template.color } : undefined}
            >
              <input
                type="color"
                aria-label="Custom color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(template.color)
                    ? template.color
                    : "#e63946"
                }
                onChange={(e) => onChange({ color: e.target.value })}
              />
            </label>
          </div>
        </div>

        <SwitchField
          label="Pulsing ring"
          description="Animate a soft ring around the marker"
          checked={template.pulse}
          onChange={(pulse) => onChange({ pulse })}
        />
        <SwitchField
          label="Wick"
          description="Show a short pin under the marker"
          checked={template.wick}
          onChange={(wick) => onChange({ wick })}
        />
      </SettingsSection>

      <SettingsSection
        title="Header image"
        icon={<ImageIcon className="h-3.5 w-3.5" />}
      >
        <HotspotImageField
          layout="split"
          value={template.image}
          onChange={(image) => onChange({ image })}
          uploadLabel="Upload image"
          emptyLabel="No header image"
          hint="Optional. Shown at the top of the preview dialog."
          clearTitle="Clear header image"
          successMessage="Header image applied"
          sizeErrorMessage="Header image must be under 2.5 MB"
          urlInput={
            <TokenInput
              value={template.image}
              placeholder="https:// or {{imageUrl}}"
              sources={fieldSources}
              onChange={(image) => onChange({ image })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Position"
        icon={<Move3D className="h-3.5 w-3.5" />}
        defaultOpen
      >
        {latLon ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel className="mb-1.5">Longitude</FieldLabel>
              <TokenInput
                value={template.positionX}
                placeholder="{{lng}}"
                sources={fieldSources}
                onChange={(positionX) => onChange({ positionX })}
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">Latitude</FieldLabel>
              <TokenInput
                value={template.positionY}
                placeholder="{{lat}}"
                sources={fieldSources}
                onChange={(positionY) => onChange({ positionY })}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel className="mb-1.5">X</FieldLabel>
              <TokenInput
                value={template.positionX}
                placeholder="{{x}}"
                sources={fieldSources}
                onChange={(positionX) => onChange({ positionX })}
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">Y</FieldLabel>
              <TokenInput
                value={template.positionY}
                placeholder="{{y}}"
                sources={fieldSources}
                onChange={(positionY) => onChange({ positionY })}
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">Z</FieldLabel>
              <TokenInput
                value={template.positionZ}
                placeholder="{{z}}"
                sources={fieldSources}
                onChange={(positionZ) => onChange({ positionZ })}
              />
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
