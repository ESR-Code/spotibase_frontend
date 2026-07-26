"use client";

import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { importGlbFile } from "@/lib/editor/io/import-glb";

export function ModelDropOverlay() {
  const [active, setActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  return (
    <div
      className={`editor-drop-overlay ${active ? "active" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragCounter((c) => c + 1);
        setActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        setDragCounter((c) => {
          const next = c - 1;
          if (next <= 0) setActive(false);
          return Math.max(0, next);
        });
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragCounter(0);
        setActive(false);
        const file = e.dataTransfer.files[0];
        if (file) void importGlbFile(file);
      }}
    >
      <div className="text-center">
        <CloudUpload
          className="mx-auto mb-3 h-12 w-12"
          style={{ color: "var(--editor-crimson-2)" }}
        />
        <div className="font-display text-xl font-bold">Drop GLB to import</div>
        <div className="mt-1 text-sm" style={{ color: "var(--editor-muted)" }}>
          Replace current scene model
        </div>
      </div>
    </div>
  );
}
