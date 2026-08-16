"use client";

import {
  Camera,
  ImageIcon,
  ListTree,
  MapPin,
  Move3D,
  Type,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { HotspotMarkerImageField } from "@/app/editor/_components/drawers/hotspot-marker-image-field";
import { PositionAxisInput } from "@/app/editor/_components/drawers/position-axis-input";
import { CameraPoseCaptureField } from "@/app/editor/_components/ui/camera-pose-capture-field";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { CategorySelect } from "@/app/editor/_components/ui/category-select";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import type { HotspotFormValues } from "@/lib/editor/forms/schemas/hotspot-form.schema";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { markerColorSwatches } from "@/lib/editor/theme/tokens";
import type { Hotspot } from "@/lib/editor/types/hotspot";

type HotspotGeneralTabProps = {
  form: UseFormReturn<HotspotFormValues>;
  selected: Hotspot;
};

export function HotspotGeneralTab({ form, selected }: HotspotGeneralTabProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const legendCategories = useSettingsStore((s) => s.legendCategories);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const values = form.watch();
  const scene = useActiveScene();
  const isGeo = scene.type === "geo";
  const isCustomColor = !markerColorSwatches.includes(
    values.color as (typeof markerColorSwatches)[number],
  );

  const handleCategoriesChange = (
    categories: typeof legendCategories,
  ) => {
    const removedIds = legendCategories
      .filter((c) => !categories.some((next) => next.id === c.id))
      .map((c) => c.id);
    setSettings({ legendCategories: categories });
    if (removedIds.length === 0) return;

    const { hotspots } = useEditorStore.getState();
    for (const hotspot of hotspots) {
      if (removedIds.includes(hotspot.category)) {
        useEditorStore.getState().updateHotspot(hotspot.id, { category: "" });
        if (hotspot.id === selected.id) {
          form.setValue("category", "");
        }
      }
    }
  };

  return (
    <div className="editor-general-tab space-y-2.5">
      <SettingsSection
        title="Title"
        icon={<Type className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className="editor-input"
            placeholder="e.g. Hydraulic Press Unit"
            {...form.register("title")}
          />
        </div>
      </SettingsSection>

      {legendEnabled ? (
        <SettingsSection
          title="Legend"
          icon={<ListTree className="h-3.5 w-3.5" />}
        >
          <CategorySelect
            value={values.category ?? ""}
            categories={legendCategories}
            allowClear
            onChange={(category) => form.setValue("category", category)}
            onCategoriesChange={handleCategoriesChange}
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
                  active={values.type === type}
                  onClick={() => form.setValue("type", type)}
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
            {(["dot", "number", "icon", "image"] as const).map((style) => (
              <TypePill
                key={style}
                active={values.style === style}
                onClick={() => form.setValue("style", style)}
              >
                {style}
              </TypePill>
            ))}
          </div>
          {values.style === "number" && (
            <input
              className="editor-input mt-2"
              type="number"
              min={0}
              placeholder="Marker number"
              {...form.register("number")}
            />
          )}
          {values.style === "icon" && (
            <div className="mt-2">
              <CategoryIconPicker
                value={values.icon ?? "Info"}
                color={values.color}
                onChange={(icon) => form.setValue("icon", icon)}
              />
            </div>
          )}
          {values.style === "image" && (
            <HotspotMarkerImageField
              value={values.markerImage ?? ""}
              onChange={(dataUrl) => {
                form.setValue("markerImage", dataUrl);
                form.setValue("style", "image");
              }}
            />
          )}
        </div>

        <div>
          <FieldLabel>Color</FieldLabel>
          <div className="editor-swatch-row">
            {markerColorSwatches.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={values.color === color}
                onClick={() => form.setValue("color", color)}
              />
            ))}
            <label
              className={`editor-swatch editor-swatch-custom ${isCustomColor ? "selected" : ""}`}
              title="Custom color"
              style={isCustomColor ? { background: values.color } : undefined}
            >
              <input
                type="color"
                aria-label="Custom color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(values.color)
                    ? values.color
                    : "#e63946"
                }
                onChange={(e) => form.setValue("color", e.target.value)}
              />
            </label>
          </div>
        </div>

        <SwitchField
          label="Pulsing ring"
          description="Animate a soft ring around the marker"
          checked={values.pulse}
          onChange={(checked) => form.setValue("pulse", checked)}
        />
      </SettingsSection>

      <SettingsSection
        title="Header image"
        icon={<ImageIcon className="h-3.5 w-3.5" />}
      >
        <HotspotImageField
          layout="split"
          value={values.image ?? ""}
          onChange={(dataUrl) => form.setValue("image", dataUrl)}
          uploadLabel="Upload image"
          emptyLabel="No header image"
          hint="Optional. Shown at the top of the preview dialog."
          clearTitle="Clear header image"
          successMessage="Header image applied"
          sizeErrorMessage="Header image must be under 2.5 MB"
          urlInput={
            <input
              className="editor-input"
              placeholder="https://…"
              {...form.register("image")}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Custom camera"
        icon={<Camera className="h-3.5 w-3.5" />}
      >
        <SwitchField
          label="Use custom camera"
          description="When enabled, focusing this hotspot moves the camera to a saved view"
          checked={selected.customCameraEnabled}
          onChange={(checked) =>
            updateHotspot(selected.id, { customCameraEnabled: checked })
          }
        />
        {selected.customCameraEnabled ? (
          <CameraPoseCaptureField
            previewUrl={selected.customCamera?.previewUrl}
            pose={selected.customCamera}
            captureLabel="Set camera position"
            emptyLabel="No camera position"
            hint="Captures the current viewport camera. Leave unset to keep the default focus framing."
            previewAlt="Hotspot camera preview"
            onCapture={() => {
              window.dispatchEvent(
                new CustomEvent("editor:set-hotspot-camera", {
                  detail: { id: selected.id },
                }),
              );
            }}
            onClear={() => {
              updateHotspot(selected.id, { customCamera: null });
              toast.success("Hotspot camera cleared");
            }}
            onPastePose={(pose) => {
              updateHotspot(selected.id, {
                customCamera: pose,
                customCameraEnabled: true,
              });
            }}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Position"
        icon={<Move3D className="h-3.5 w-3.5" />}
        defaultOpen
      >
        {isGeo ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel className="mb-1.5">Longitude</FieldLabel>
              <PositionAxisInput
                aria-label="Longitude"
                value={selected.position.x}
                onChange={(x) =>
                  updateHotspot(selected.id, {
                    position: { ...selected.position, x },
                  })
                }
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">Latitude</FieldLabel>
              <PositionAxisInput
                aria-label="Latitude"
                value={selected.position.y}
                onChange={(y) =>
                  updateHotspot(selected.id, {
                    position: { ...selected.position, y },
                  })
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel className="mb-1.5">X</FieldLabel>
              <PositionAxisInput
                aria-label="Position X"
                value={selected.position.x}
                onChange={(x) =>
                  updateHotspot(selected.id, {
                    position: { ...selected.position, x },
                  })
                }
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">Y</FieldLabel>
              <PositionAxisInput
                aria-label="Position Y"
                value={selected.position.y}
                onChange={(y) =>
                  updateHotspot(selected.id, {
                    position: { ...selected.position, y },
                  })
                }
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">Z</FieldLabel>
              <PositionAxisInput
                aria-label="Position Z"
                value={selected.position.z}
                onChange={(z) =>
                  updateHotspot(selected.id, {
                    position: { ...selected.position, z },
                  })
                }
              />
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
