"use client";

import { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { importSubjectFile } from "@/lib/editor/io/import-subject";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useActiveScene } from "@/lib/editor/state/scenes-store";

/** Listens on the viewport wrap (parent) so drag works even while overlay is non-interactive. */
export function ModelDropOverlay() {
  const [active, setActive] = useState(false);
  const scene = useActiveScene();
  const descriptor = getSceneType(scene.type);

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
      if (file) void importSubjectFile(file);
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

  const dropLabel =
    scene.type === "image" ? "Drop image to import" : "Drop GLB to import";
  const dropHint =
    scene.type === "image"
      ? "Replace current scene image"
      : "Replace current scene model";

  return (
    <div className={`editor-drop-overlay ${active ? "active" : ""}`}>
      <div className="text-center">
        <CloudUpload
          className="mx-auto mb-3 h-12 w-12"
          style={{ color: "var(--editor-crimson-2)" }}
        />
        <div className="font-display text-xl font-bold">{dropLabel}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--editor-muted)" }}>
          {dropHint}
          <span className="mt-1 block text-xs opacity-70">
            Accepts {descriptor.extensions.map((e) => `.${e}`).join(", ")}
          </span>
        </div>
      </div>
    </div>
  );
}
