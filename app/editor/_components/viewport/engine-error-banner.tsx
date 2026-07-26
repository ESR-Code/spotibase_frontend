"use client";

import { AlertTriangle } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";

type EngineErrorBannerProps = {
  message: string;
};

export function EngineErrorBanner({ message }: EngineErrorBannerProps) {
  return (
    <div
      className="absolute left-1/2 top-1/2 z-[100] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 text-center"
      style={{
        background: "#1a0a0e",
        border: "1px solid rgba(230,57,70,0.5)",
      }}
    >
      <AlertTriangle
        className="mx-auto mb-3 h-10 w-10"
        style={{ color: "var(--editor-crimson-2)" }}
      />
      <div className="font-display mb-2 text-lg font-bold">3D Engine Error</div>
      <div className="mb-3 text-sm" style={{ color: "var(--editor-muted)" }}>
        {message}
      </div>
      <EditorButton variant="primary" onClick={() => window.location.reload()}>
        Reload Page
      </EditorButton>
    </div>
  );
}
