"use client";

import { Box, ImageIcon } from "lucide-react";
import { assetFileUrl, type EditorAsset } from "@/lib/editor/assets";
import { cn } from "@/lib/utils";

export function AssetThumb({
  asset,
  className,
}: {
  asset: EditorAsset;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md",
        className,
      )}
      style={{
        background: "var(--editor-input-bg)",
        border: "1px solid var(--editor-line)",
        color: "var(--editor-muted-2)",
      }}
    >
      {asset.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetFileUrl(asset)}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : asset.kind === "model" ? (
        <Box className="h-5 w-5" />
      ) : (
        <ImageIcon className="h-5 w-5" />
      )}
    </div>
  );
}
