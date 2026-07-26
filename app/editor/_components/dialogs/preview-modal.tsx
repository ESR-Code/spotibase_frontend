"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function PreviewModal() {
  const open = useUIStore((s) => s.previewModalOpen);
  const index = useUIStore((s) => s.previewModalIndex);
  const setOpen = useUIStore((s) => s.setPreviewModalOpen);
  const setIndex = useUIStore((s) => s.setPreviewModalIndex);
  const hotspots = useEditorStore((s) => s.hotspots);

  const hotspot = hotspots[index] ?? null;
  const count = hotspots.length;

  const close = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("editor:reset-camera"));
  }, [setOpen]);

  const goPrev = useCallback(() => {
    if (count === 0) return;
    setIndex((index - 1 + count) % count);
  }, [count, index, setIndex]);

  const goNext = useCallback(() => {
    if (count === 0) return;
    setIndex((index + 1) % count);
  }, [count, index, setIndex]);

  useEffect(() => {
    if (!open || !hotspot) return;
    window.dispatchEvent(
      new CustomEvent("editor:focus-hotspot", { detail: { id: hotspot.id } }),
    );
  }, [open, hotspot?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, goPrev, goNext]);

  if (!open || !hotspot) return null;

  const imageSrc =
    hotspot.image || `https://picsum.photos/seed/vf${hotspot.id}/600/400`;

  return (
    <div
      className="editor-modal-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="editor-modal-card editor-glass editor-panel-shadow overflow-hidden rounded-2xl"
        style={{ border: "1px solid var(--editor-line)" }}
      >
        <div
          className="relative"
          style={{
            height: 200,
            background: "linear-gradient(135deg, #15243f, #0c1730)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 40%, rgba(11,20,36,0.95))",
            }}
          />
          <IconButton
            title="Close"
            className="absolute right-3 top-3 z-10"
            style={{
              background: "rgba(11,20,36,0.7)",
              border: "1px solid var(--editor-line)",
              backdropFilter: "blur(8px)",
            }}
            onClick={close}
          >
            <X />
          </IconButton>
          <div className="absolute bottom-3 left-5 flex items-center gap-2">
            <span
              className="editor-chip"
              style={{
                color: hotspot.color,
                borderColor: `${hotspot.color}66`,
                background: `${hotspot.color}22`,
              }}
            >
              {hotspot.type.toUpperCase()}
            </span>
            <span className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
              HSP-{String(hotspot.id).padStart(3, "0")}
            </span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-display mb-2 text-xl font-bold">{hotspot.title}</h3>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "var(--editor-muted)" }}
          >
            {hotspot.desc || "No description provided."}
          </p>
          {hotspot.link ? (
            <div className="mt-4">
              <a
                href={hotspot.link}
                target="_blank"
                rel="noreferrer"
                className="editor-btn editor-btn-primary inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Link
              </a>
            </div>
          ) : null}
        </div>

        <div
          className="flex items-center justify-between px-6 py-3"
          style={{
            borderTop: "1px solid var(--editor-line-soft)",
            background: "rgba(11,20,36,0.4)",
          }}
        >
          <EditorButton variant="ghost" className="text-[12px]" onClick={goPrev}>
            <ChevronLeft className="h-3 w-3" />
            Prev
          </EditorButton>
          <span className="text-[11px]" style={{ color: "var(--editor-muted-2)" }}>
            {index + 1} / {count}
          </span>
          <EditorButton variant="ghost" className="text-[12px]" onClick={goNext}>
            Next
            <ChevronRight className="h-3 w-3" />
          </EditorButton>
        </div>
      </div>
    </div>
  );
}
