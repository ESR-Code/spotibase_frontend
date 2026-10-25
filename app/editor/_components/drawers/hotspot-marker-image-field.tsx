"use client";

import { ImageOff, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AssetPickerButton } from "@/app/editor/_components/assets/asset-picker-button";
import { useImageUpload } from "@/app/editor/_components/drawers/hotspot-image-field";
import {
  assetIdFromRef,
  assetRef,
  formatAssetSize,
  IMAGE_ASSET_ACCEPT,
  useAssetSrc,
  useAssetsStore,
  useIsMissingAssetRef,
} from "@/lib/editor/assets";
import { toast } from "@/lib/editor/toast";
import { cn } from "@/lib/utils";

type HotspotMarkerImageFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

const SUCCESS = "Marker image applied";

/**
 * Marker icons are small and often transparent: show the whole image in a
 * square tile over a checkerboard, with its name / size and compact actions
 * beside it. The empty tile is itself the upload target (click or drop).
 */
export function HotspotMarkerImageField({
  value,
  onChange,
}: HotspotMarkerImageFieldProps) {
  const { uploading, handleFile } = useImageUpload(onChange, SUCCESS);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const src = useAssetSrc(value);
  const missing = useIsMissingAssetRef(value);
  const assetId = assetIdFromRef(value);
  const asset = useAssetsStore((s) => (assetId ? s.assets[assetId] : undefined));

  const hasImage = Boolean(value) && !missing;
  const title = missing
    ? "Missing asset"
    : asset
      ? asset.name
      : value
        ? "Linked image"
        : "No marker image";
  const meta = missing
    ? "The file was removed from the library"
    : asset
      ? [
          asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
          formatAssetSize(asset.size),
        ]
          .filter(Boolean)
          .join(" · ")
      : value
        ? "URL or field token"
        : "PNG, SVG or WebP with transparency";

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "editor-marker-image-field mt-2",
        dragging && "is-dragging",
      )}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          toast.error("Drop an image file");
          return;
        }
        handleFile(file);
      }}
    >
      <button
        type="button"
        className={cn(
          "editor-marker-image-tile",
          hasImage && "editor-checkerboard",
          !value && "is-empty",
          missing && "is-missing",
        )}
        title={hasImage ? "Replace image" : "Upload image"}
        aria-label={hasImage ? "Replace marker image" : "Upload marker image"}
        onClick={openPicker}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : missing ? (
          <ImageOff className="h-5 w-5" />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[12.5px] font-semibold"
          style={{ color: missing ? "var(--editor-crimson)" : "var(--editor-fg)" }}
          title={title}
        >
          {uploading ? "Uploading…" : title}
        </div>
        <div className="truncate text-[11px]" style={{ color: "var(--editor-muted)" }}>
          {dragging ? "Drop to upload" : meta}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="editor-btn editor-btn-sm"
            onClick={openPicker}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            {value ? "Replace" : "Upload"}
          </button>
          <AssetPickerButton
            kind="image"
            label="Library"
            className="editor-btn-sm"
            onPick={(picked) => {
              onChange(assetRef(picked.id));
              toast.success(SUCCESS);
            }}
          />
          {value ? (
            <button
              type="button"
              className="editor-btn editor-btn-ghost editor-btn-sm editor-btn-remove"
              onClick={() => onChange("")}
              disabled={uploading}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ASSET_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
