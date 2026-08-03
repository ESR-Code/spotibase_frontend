"use client";

import { Camera, Crosshair } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";

type CameraPoseCaptureFieldProps = {
  previewUrl?: string | null;
  onCapture: () => void;
  onClear: () => void;
  captureLabel?: string;
  emptyLabel?: string;
  hint?: string;
  previewAlt?: string;
};

export function CameraPoseCaptureField({
  previewUrl,
  onCapture,
  onClear,
  captureLabel = "Set camera position",
  emptyLabel = "No camera position",
  hint,
  previewAlt = "Camera position preview",
}: CameraPoseCaptureFieldProps) {
  const hasPreview = Boolean(previewUrl);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0 space-y-2">
        <EditorButton className="w-full justify-center" onClick={onCapture}>
          <Crosshair className="h-3.5 w-3.5" />
          {captureLabel}
        </EditorButton>
        <EditorButton
          className="w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasPreview}
          onClick={onClear}
        >
          Clear
        </EditorButton>
        {hint ? (
          <p className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            {hint}
          </p>
        ) : null}
      </div>
      <div
        className="flex h-[108px] items-center justify-center overflow-hidden rounded-lg text-xs"
        style={{
          background: "var(--editor-input-bg)",
          border: "1px solid var(--editor-line)",
          color: "var(--editor-muted-2)",
        }}
      >
        {hasPreview && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={previewAlt}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="inline-flex flex-col items-center gap-1.5 px-2 text-center">
            <Camera className="h-3.5 w-3.5" />
            {emptyLabel}
          </span>
        )}
      </div>
    </div>
  );
}
