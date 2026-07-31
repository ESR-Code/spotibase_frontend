"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { CheckboxField } from "@/app/editor/_components/ui/checkbox-field";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { HotspotMarkerImageField } from "@/app/editor/_components/drawers/hotspot-marker-image-field";
import { PositionAxisInput } from "@/app/editor/_components/drawers/position-axis-input";
import type { HotspotFormValues } from "@/lib/editor/forms/schemas/hotspot-form.schema";
import { markerColorSwatches, markerIcons } from "@/lib/editor/theme/tokens";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import { useEditorStore } from "@/lib/editor/state/editor-store";

type HotspotGeneralTabProps = {
  form: UseFormReturn<HotspotFormValues>;
  selected: Hotspot;
};

function FormSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="editor-form-section">
      {title ? <div className="editor-form-section-title">{title}</div> : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function HotspotGeneralTab({ form, selected }: HotspotGeneralTabProps) {
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const values = form.watch();

  return (
    <div className="editor-general-tab">
      <div className="mb-1 flex items-center gap-2">
        <span className="editor-chip">HSP-{String(selected.id).padStart(3, "0")}</span>
        <span className="text-[11px]" style={{ color: "var(--editor-muted-2)" }}>
          {values.type}
        </span>
      </div>

      <FormSection title="Content">
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className="editor-input"
            placeholder="e.g. Hydraulic Press Unit"
            {...form.register("title")}
          />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="editor-textarea editor-textarea-compact"
            placeholder="Short note for editors (not shown in preview)…"
            rows={2}
            {...form.register("desc")}
          />
        </div>
      </FormSection>

      <FormSection title="Marker">
        <div>
          <FieldLabel>Type</FieldLabel>
          <div className="editor-pill-row">
            {(["info", "warning", "spec", "link"] as const).map((type) => (
              <TypePill
                key={type}
                active={values.type === type}
                onClick={() => form.setValue("type", type)}
              >
                {type}
              </TypePill>
            ))}
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
            <select className="editor-select mt-2" {...form.register("icon")}>
              {markerIcons.map((icon) => (
                <option key={icon.value} value={icon.value}>
                  {icon.label}
                </option>
              ))}
            </select>
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
          </div>
        </div>

        <CheckboxField
          label="Pulsing ring"
          description="Animate a soft ring around the marker"
          checked={values.pulse}
          onChange={(checked) => form.setValue("pulse", checked)}
        />
      </FormSection>

      <FormSection>
        <div>
          <FieldLabel>Header image</FieldLabel>
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
        </div>

        <div>
          <FieldLabel>Link</FieldLabel>
          <input
            className="editor-input"
            placeholder="https://external-docs…"
            {...form.register("link")}
          />
        </div>
      </FormSection>

      <FormSection title="Position">
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
      </FormSection>
    </div>
  );
}
