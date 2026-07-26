"use client";

import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/app/editor/_components/ui/icon-button";

const MAX_BYTES = 2.5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

type HotspotMarkerImageFieldProps = {
  value: string;
  onChange: (dataUrl: string) => void;
};

export function HotspotMarkerImageField({
  value,
  onChange,
}: HotspotMarkerImageFieldProps) {
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <label className="editor-btn mb-0 flex-1 cursor-pointer justify-center">
          <Upload className="h-4 w-4" />
          Upload icon
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                toast.error("Please choose an image file");
                return;
              }
              if (file.size > MAX_BYTES) {
                toast.error("Marker image must be under 2.5 MB");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                onChange(String(reader.result ?? ""));
                toast.success("Marker image applied");
              };
              reader.onerror = () => toast.error("Could not read image file");
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <IconButton
          title="Clear marker image"
          onClick={() => onChange("")}
          disabled={!value}
        >
          <X />
        </IconButton>
      </div>
      <div className="mt-2 text-[11px]" style={{ color: "var(--editor-muted)" }}>
        PNG / SVG / WebP with transparency works best (pins, landmarks, custom icons).
      </div>
      <div
        className="mt-2.5 flex h-[72px] items-center justify-center overflow-hidden rounded-lg text-xs"
        style={{
          background: "var(--editor-input-bg)",
          border: "1px solid var(--editor-line)",
          color: "var(--editor-muted-2)",
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Marker preview" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="inline-flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5" />
            No marker image
          </span>
        )}
      </div>
    </div>
  );
}
