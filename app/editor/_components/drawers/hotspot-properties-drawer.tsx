"use client";

import { Copy, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { HotspotMarkerImageField } from "@/app/editor/_components/drawers/hotspot-marker-image-field";
import { useHotspotForm } from "@/lib/editor/forms/use-hotspot-form";
import { markerColorSwatches, markerIcons } from "@/lib/editor/theme/tokens";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function HotspotPropertiesDrawer() {
  const open = useUIStore((s) => s.propertiesDrawerOpen);
  const setOpen = useUIStore((s) => s.setPropertiesDrawerOpen);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const duplicateHotspot = useEditorStore((s) => s.duplicateHotspot);
  const selectHotspot = useEditorStore((s) => s.selectHotspot);
  const { form, selected } = useHotspotForm();

  if (!selected) {
    return (
      <GlassPanel
        className={`editor-drawer flex flex-col ${open ? "open" : ""}`}
        style={{ borderLeft: "1px solid var(--editor-line)" }}
      />
    );
  }

  const values = form.watch();

  return (
    <GlassPanel
      className={`editor-drawer flex flex-col ${open ? "open" : ""}`}
      style={{ borderLeft: "1px solid var(--editor-line)" }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--editor-line)" }}
      >
        <div>
          <div className="font-display text-[15px] font-bold">Hotspot Editor</div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Edit marker properties
          </div>
        </div>
        <IconButton
          title="Close"
          onClick={() => {
            setOpen(false);
            selectHotspot(null);
          }}
        >
          <X />
        </IconButton>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="flex items-center gap-2">
          <span className="editor-chip">HSP-{String(selected.id).padStart(3, "0")}</span>
        </div>

        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className="editor-input"
            placeholder="e.g. Hydraulic Press Unit"
            {...form.register("title")}
          />
        </div>

        <div>
          <FieldLabel>Type</FieldLabel>
          <div className="flex gap-2">
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
          <FieldLabel>Marker Style</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
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
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="editor-textarea"
            placeholder="Describe this point of interest..."
            {...form.register("desc")}
          />
        </div>

        <div>
          <FieldLabel>Image URL</FieldLabel>
          <input
            className="editor-input"
            placeholder="https://..."
            {...form.register("image")}
          />
        </div>

        <div>
          <FieldLabel>Marker Color</FieldLabel>
          <div className="grid grid-cols-6 gap-2">
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

        <div className="flex items-center justify-between">
          <FieldLabel className="mb-0">Pulsing Ring</FieldLabel>
          <input type="checkbox" {...form.register("pulse")} />
        </div>

        <div>
          <FieldLabel>Link (optional)</FieldLabel>
          <input
            className="editor-input"
            placeholder="https://external-docs..."
            {...form.register("link")}
          />
        </div>

        <div className="border-t pt-4" style={{ borderColor: "var(--editor-line-soft)" }}>
          <FieldLabel>Position (XYZ)</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            <input className="editor-input" readOnly value={selected.position.x.toFixed(3)} />
            <input className="editor-input" readOnly value={selected.position.y.toFixed(3)} />
            <input className="editor-input" readOnly value={selected.position.z.toFixed(3)} />
          </div>
        </div>
      </div>

      <div
        className="flex flex-shrink-0 gap-2 p-4"
        style={{ borderTop: "1px solid var(--editor-line)" }}
      >
        <EditorButton
          className="flex-1"
          onClick={() => {
            duplicateHotspot(selected.id);
            toast.success("Hotspot duplicated");
          }}
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </EditorButton>
        <EditorButton
          className="flex-1"
          style={{ color: "#ff8a95", borderColor: "rgba(230,57,70,0.4)" }}
          onClick={() => {
            if (selectedId != null) {
              removeHotspot(selectedId);
              setOpen(false);
              toast.success("Hotspot deleted");
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </EditorButton>
      </div>
    </GlassPanel>
  );
}
