"use client";

import { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { importGlbFile } from "@/lib/editor/io/import-glb";

/** Listens on the viewport wrap (parent) so drag works even while overlay is non-interactive. */
export function ModelDropOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const wrap = document.getElementById("editor-viewport-wrap");
    if (!wrap) return;

    let dragCounter = 0;

    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter += 1;
      setActive(true);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onLeave = () => {
      dragCounter -= 1;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setActive(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void importGlbFile(file);
    };

    wrap.addEventListener("dragenter", onEnter);
    wrap.addEventListener("dragover", onOver);
    wrap.addEventListener("dragleave", onLeave);
    wrap.addEventListener("drop", onDrop);
    return () => {
      wrap.removeEventListener("dragenter", onEnter);
      wrap.removeEventListener("dragover", onOver);
      wrap.removeEventListener("dragleave", onLeave);
      wrap.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <div className={`editor-drop-overlay ${active ? "active" : ""}`}>
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
