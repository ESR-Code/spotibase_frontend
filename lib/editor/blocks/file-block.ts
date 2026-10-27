"use client";

import {
  assetFileUrl,
  assetIdFromRef,
  formatAssetSize,
  useAssetsStore,
  type EditorAsset,
} from "@/lib/editor/assets";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import { normalizeExternalUrl } from "@/lib/editor/utils/open-external-url";
import type { FileBlock } from "@/lib/editor/types/hotspot-block";

/** Upper-case extension of a file name or URL path (`PDF`), or "". */
export function fileTypeLabel(nameOrUrl: string): string {
  const path = nameOrUrl.split(/[?#]/)[0] ?? "";
  const last = path.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  if (dot <= 0 || dot === last.length - 1) return "";
  const ext = last.slice(dot + 1);
  return ext.length <= 5 ? ext.toUpperCase() : "";
}

function fileNameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").pop() ?? "";
    return decodeURIComponent(last);
  } catch {
    return "";
  }
}

export type FileBlockTarget = {
  /** Library asset (null for URLs). */
  asset: EditorAsset | null;
  href: string;
  /** Title shown on the card. */
  label: string;
  /** "PDF · 1.2 MB" style line; may be empty. */
  meta: string;
  /** Set for library files so the browser downloads with the original name. */
  downloadName?: string;
};

/**
 * Resolves a File block for rendering: library asset → same-origin download,
 * anything else → interpolated http(s) URL opened in a new tab. Null when the
 * source is empty, missing, or not a valid URL.
 */
export function useFileBlockTarget(block: FileBlock): FileBlockTarget | null {
  const assetId = assetIdFromRef(block.src);
  const asset = useAssetsStore((s) => (assetId ? s.assets[assetId] ?? null : null));
  const label = useInterpolatedPlainText(block.label).trim();
  const src = useInterpolatedPlainText(assetId ? "" : block.src).trim();

  if (assetId) {
    if (!asset) return null;
    const type = fileTypeLabel(asset.filename);
    return {
      asset,
      href: assetFileUrl(asset),
      label: label || asset.name,
      meta: [type, formatAssetSize(asset.size)].filter(Boolean).join(" · "),
      downloadName: asset.filename,
    };
  }

  const href = normalizeExternalUrl(src);
  if (!href) return null;
  return {
    asset: null,
    href,
    label: label || fileNameFromUrl(href) || "Download file",
    meta: fileTypeLabel(href),
  };
}
