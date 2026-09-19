"use client";

import { Camera, ClipboardPaste, Copy, Crosshair } from "lucide-react";
import { toast } from "@/lib/editor/toast";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { cloneCameraResetPosition } from "@/lib/editor/constants/default-settings";
import { useCameraPoseClipboardStore } from "@/lib/editor/state/camera-pose-clipboard-store";
import type { CameraResetPosition } from "@/lib/editor/types/editor-settings";

type CameraPoseCaptureFieldProps = {
  previewUrl?: string | null;
  /** Full pose for copy/paste. When set, small Copy / Paste controls appear. */
  pose?: CameraResetPosition | null;
  onCapture: () => void;
  onClear: () => void;
  /** Called when Paste applies a clipboard pose to this field. */
  onPastePose?: (pose: CameraResetPosition) => void;
  captureLabel?: string;
  emptyLabel?: string;
  hint?: string;
  previewAlt?: string;
};

export function CameraPoseCaptureField({
  previewUrl,
  pose = null,
  onCapture,
  onClear,
  onPastePose,
  captureLabel = "Set camera position",
  emptyLabel = "No camera position",
  hint,
  previewAlt = "Camera position preview",
}: CameraPoseCaptureFieldProps) {
  const hasPreview = Boolean(previewUrl);
  const clipboardPose = useCameraPoseClipboardStore((s) => s.pose);
  const copyToClipboard = useCameraPoseClipboardStore((s) => s.copy);
  const canCopy = Boolean(pose);
  const canPaste = Boolean(onPastePose && clipboardPose);

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
        {onPastePose ? (
          <div className="flex items-center gap-1.5">
            <IconButton
              title="Copy camera"
              disabled={!canCopy}
              className="h-7 w-7"
              style={{ width: 28, height: 28 }}
              onClick={() => {
                if (!pose) return;
                copyToClipboard(pose);
                toast.success("Camera copied");
              }}
            >
              <Copy className="h-3 w-3" />
            </IconButton>
            <IconButton
              title="Paste camera"
              disabled={!canPaste}
              className="h-7 w-7"
              style={{ width: 28, height: 28 }}
              onClick={() => {
                const next = cloneCameraResetPosition(clipboardPose);
                if (!next || !onPastePose) return;
                onPastePose(next);
                toast.success("Camera pasted");
              }}
            >
              <ClipboardPaste className="h-3 w-3" />
            </IconButton>
            <span
              className="text-[10px] font-medium"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Copy / Paste
            </span>
          </div>
        ) : null}
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
