"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { AssetPickerButton } from "@/app/editor/_components/assets/asset-picker-button";
import { TokenField } from "@/app/editor/_components/blocks/token-field";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  ASSET_LIMITS,
  assetIdFromRef,
  assetRef,
  FILE_ASSET_ACCEPT,
  formatAssetSize,
  uploadAsset,
  useAssetsStore,
} from "@/lib/editor/assets";
import { fileTypeLabel } from "@/lib/editor/blocks/file-block";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { toast } from "@/lib/editor/toast";
import type { FileBlock } from "@/lib/editor/types/hotspot-block";

type FileBlockEditorProps = {
  block: FileBlock;
  onChange: (patch: Partial<Pick<FileBlock, "src" | "label">>) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

export function FileBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources,
}: FileBlockEditorProps) {
  const [uploading, setUploading] = useState(false);
  const assetId = assetIdFromRef(block.src);
  const asset = useAssetsStore((s) => (assetId ? s.assets[assetId] ?? null : null));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadAsset(file, {
        kind: "other",
        sceneId: useScenesStore.getState().activeSceneId,
      });
      onChange({ src: assetRef(uploaded.id) });
    } catch (error) {
      toast.error(
        `${file.name}: ${error instanceof Error ? error.message : "Could not upload file"}`,
      );
    } finally {
      setUploading(false);
    }
  };

  const uploadInput = (
    <input
      type="file"
      accept={FILE_ASSET_ACCEPT}
      className="hidden"
      disabled={uploading}
      onChange={(e) => {
        void handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="space-y-2.5">
      {assetId ? (
        <div
          className="flex items-center gap-2 rounded-lg p-2"
          style={{
            border: "1px solid var(--editor-line-soft)",
            background: "rgba(11,20,36,0.35)",
          }}
        >
          <FileText
            className="h-4 w-4 flex-shrink-0"
            style={{ color: "var(--editor-muted-2)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold">
              {asset ? asset.filename : "Missing file"}
            </div>
            <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
              {asset
                ? [fileTypeLabel(asset.filename), formatAssetSize(asset.size)]
                    .filter(Boolean)
                    .join(" · ")
                : "This file is no longer in the project library."}
            </div>
          </div>
          <IconButton
            title="Remove file"
            onClick={() => onChange({ src: "" })}
            style={{ width: 26, height: 26 }}
          >
            <X className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ) : (
        <>
          {block.src ? null : (
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-5 text-center"
              style={{
                border: "1px dashed var(--editor-line)",
                background: "rgba(11,20,36,0.35)",
              }}
            >
              {uploading ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  style={{ color: "var(--editor-muted-2)" }}
                />
              ) : (
                <Upload
                  className="h-4 w-4"
                  style={{ color: "var(--editor-muted-2)" }}
                />
              )}
              <span className="text-[12px] font-semibold">
                {uploading ? "Uploading…" : "Upload a file"}
              </span>
              <span className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
                PDF, Office, CSV, TXT, or ZIP, up to{" "}
                {formatAssetSize(ASSET_LIMITS.other.maxBytes)}.
              </span>
              {uploadInput}
            </label>
          )}
          <label className="block">
            <FieldLabel className="mb-1">File URL</FieldLabel>
            <TokenField
              value={block.src}
              placeholder="https://… or insert a field"
              autoFocus={autoFocus}
              sources={fieldSources}
              onChange={(src) => onChange({ src })}
            />
          </label>
        </>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {assetId ? (
          <label className="editor-btn mb-0 cursor-pointer justify-center text-[12px]">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Replace
            {uploadInput}
          </label>
        ) : null}
        <AssetPickerButton
          kind="other"
          label="Library"
          className="text-[12px]"
          onPick={(picked) => onChange({ src: assetRef(picked.id) })}
        />
      </div>

      <label className="block">
        <FieldLabel className="mb-1">Title</FieldLabel>
        <TokenField
          value={block.label}
          placeholder={asset ? asset.name : "Defaults to the file name"}
          sources={fieldSources}
          onChange={(label) => onChange({ label })}
        />
      </label>
    </div>
  );
}
