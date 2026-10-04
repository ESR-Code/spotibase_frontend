"use client";

import { ImageIcon, ImageOff, Loader2, Upload, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "@/lib/editor/toast";
import { AssetPickerButton } from "@/app/editor/_components/assets/asset-picker-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  assetRef,
  IMAGE_ASSET_ACCEPT,
  isAssetRef,
  uploadAsset,
  useAssetSrc,
  useIsMissingAssetRef,
} from "@/lib/editor/assets";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { cn } from "@/lib/utils";

type HotspotImageFieldProps = {
  /** `asset:<id>`, a URL / token, or empty. */
  value: string;
  onChange: (value: string) => void;
  uploadLabel?: string;
  emptyLabel?: string;
  hint?: string;
  clearTitle?: string;
  successMessage?: string;
  className?: string;
  /** `split` = controls left, preview right. */
  layout?: "stack" | "split";
  /** Optional URL / extra controls rendered above the upload button. */
  urlInput?: ReactNode;
};

export function HotspotImageField({
  value,
  onChange,
  uploadLabel = "Upload image",
  emptyLabel = "No image",
  hint = "PNG / JPG / WebP / SVG / GIF, up to 25 MB.",
  clearTitle = "Clear image",
  successMessage = "Image applied",
  className,
  layout = "stack",
  urlInput,
}: HotspotImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const src = useAssetSrc(value);
  const missing = useIsMissingAssetRef(value);
  const isUploaded = value.startsWith("data:") || isAssetRef(value);
  const showUrlInput = Boolean(urlInput) && !isUploaded;

  const handleFile = (file: File) => {
    setUploading(true);
    const sceneId = useScenesStore.getState().activeSceneId;
    void uploadAsset(file, { kind: "image", sceneId })
      .then((asset) => {
        onChange(assetRef(asset.id));
        toast.success(successMessage);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not upload image");
      })
      .finally(() => setUploading(false));
  };

  const controls = (
    <div className="min-w-0">
      {showUrlInput ? <div className="mb-2">{urlInput}</div> : null}
      <div className="flex gap-2">
        <label
          className={cn(
            "editor-btn mb-0 flex-1 cursor-pointer justify-center",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : uploadLabel}
          <input
            type="file"
            accept={IMAGE_ASSET_ACCEPT}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </label>
        <AssetPickerButton
          kind="image"
          onPick={(asset) => {
            onChange(assetRef(asset.id));
            toast.success(successMessage);
          }}
        />
        <IconButton title={clearTitle} onClick={() => onChange("")} disabled={!value}>
          <X />
        </IconButton>
      </div>
      {hint ? (
        <div className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );

  const preview = (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg text-xs",
        layout === "split" ? "h-[88px] max-h-[88px]" : "mt-2 h-[72px]",
      )}
      style={{
        background: "var(--editor-input-bg)",
        border: "1px solid var(--editor-line)",
        color: "var(--editor-muted-2)",
      }}
    >
      {missing ? (
        <span
          className="inline-flex items-center gap-2 px-2 text-center"
          style={{ color: "var(--editor-crimson)" }}
        >
          <ImageOff className="h-3.5 w-3.5" />
          Missing asset
        </span>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Preview" className="h-full w-full object-cover" />
      ) : (
        <span className="inline-flex items-center gap-2 px-2 text-center">
          <ImageIcon className="h-3.5 w-3.5" />
          {emptyLabel}
        </span>
      )}
    </div>
  );

  if (layout === "split") {
    return (
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {controls}
        {preview}
      </div>
    );
  }

  return (
    <div className={className}>
      {controls}
      {preview}
    </div>
  );
}
