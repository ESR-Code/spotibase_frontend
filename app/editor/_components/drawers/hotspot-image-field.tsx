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
  /** Extra controls under the upload row (scene thumbnail screenshot, etc.). */
  extraActions?: ReactNode;
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
  extraActions,
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
      <div className="flex min-w-0 gap-2">
        <label
          className={cn(
            "editor-btn mb-0 min-w-0 flex-1 cursor-pointer justify-center overflow-hidden",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">
            {uploading ? "Uploading…" : uploadLabel}
          </span>
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
      </div>
      {extraActions ? <div className="mt-2">{extraActions}</div> : null}
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
        "relative flex min-w-0 items-center justify-center overflow-hidden rounded-lg text-xs",
        layout === "split" ? "min-h-[88px] self-stretch" : "mt-2 h-[72px]",
      )}
      style={{
        background: "var(--editor-input-bg)",
        border: "1px solid var(--editor-line)",
        color: "var(--editor-muted-2)",
      }}
    >
      {missing ? (
        <span
          className="flex max-w-full flex-col items-center gap-1.5 px-3 text-center text-[11px] leading-snug"
          style={{ color: "var(--editor-crimson)" }}
        >
          <ImageOff className="h-4 w-4 shrink-0" />
          Missing asset
        </span>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="flex max-w-full flex-col items-center gap-1.5 px-3 text-center text-[11px] leading-snug">
          <ImageIcon className="h-4 w-4 shrink-0 opacity-70" />
          {emptyLabel}
        </span>
      )}
      {value ? (
        <IconButton
          title={clearTitle}
          aria-label={clearTitle}
          className="absolute right-1.5 top-1.5 z-[1] border border-[var(--editor-line)] bg-[rgba(9,15,31,0.82)]"
          onClick={() => onChange("")}
        >
          <X />
        </IconButton>
      ) : null}
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
