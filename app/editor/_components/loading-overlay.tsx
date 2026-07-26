"use client";

import { useUIStore } from "@/lib/editor/state/ui-store";

export function LoadingOverlay() {
  const isLoading = useUIStore((s) => s.isLoading);

  if (!isLoading) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{ background: "var(--editor-bg)" }}
    >
      <div className="text-center">
        <div className="editor-spinner mx-auto mb-4" />
        <div className="font-display text-lg font-bold">VectorForge</div>
        <div className="text-sm" style={{ color: "var(--editor-muted)" }}>
          Loading 3D engine...
        </div>
      </div>
    </div>
  );
}
