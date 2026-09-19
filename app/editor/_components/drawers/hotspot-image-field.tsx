"use client";

import { ImageIcon, Upload, X } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "@/lib/editor/toast";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  HOTSPOT_IMAGE_ACCEPT,
  ImageFileReadError,
  readImageFileAsDataUrl,
} from "@/lib/editor/io/read-image-data-url";
import { cn } from "@/lib/utils";

type HotspotImageFieldProps = {
  value: string;
  onChange: (dataUrl: string) => void;
  uploadLabel?: string;
  emptyLabel?: string;
  hint?: string;
  clearTitle?: string;
  successMessage?: string;
  sizeErrorMessage?: string;
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
  hint = "PNG / JPG / WebP / SVG, up to 2.5 MB.",
  clearTitle = "Clear image",
  successMessage = "Image applied",
  sizeErrorMessage = "Image must be under 2.5 MB",
  className,
  layout = "stack",
  urlInput,
}: HotspotImageFieldProps) {
  const isUploaded = value.startsWith("data:");
  const showUrlInput = Boolean(urlInput) && !isUploaded;

  const controls = (
    <div className="min-w-0">
      {showUrlInput ? <div className="mb-2">{urlInput}</div> : null}
      <div className="flex gap-2">
        <label className="editor-btn mb-0 flex-1 cursor-pointer justify-center">
          <Upload className="h-4 w-4" />
          {uploadLabel}
          <input
            type="file"
            accept={HOTSPOT_IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void readImageFileAsDataUrl(file)
                .then((dataUrl) => {
                  onChange(dataUrl);
                  toast.success(successMessage);
                })
                .catch((error) => {
                  const fallback =
                    error instanceof ImageFileReadError
                      ? error.message
                      : "Could not read image file";
                  toast.error(
                    fallback.includes("2.5 MB") ? sizeErrorMessage : fallback,
                  );
                });
            }}
          />
        </label>
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
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Preview"
          className="h-full w-full object-cover"
        />
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
