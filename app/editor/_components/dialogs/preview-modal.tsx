"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { HotspotBlocksPreview } from "@/app/editor/_components/blocks/hotspot-blocks-preview";
import { CategoryOptionBadge } from "@/app/editor/_components/ui/category-option";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function PreviewModal() {
  const open = useUIStore((s) => s.previewModalOpen);
  const index = useUIStore((s) => s.previewModalIndex);
  const setOpen = useUIStore((s) => s.setPreviewModalOpen);
  const setIndex = useUIStore((s) => s.setPreviewModalIndex);
  const hotspots = useEditorStore((s) => s.hotspots);
  const presentation = useSettingsStore((s) => s.markerDialogPresentation);
  const size = useSettingsStore((s) => s.markerDialogSize);
  const backdrop = useSettingsStore((s) => s.markerDialogBackdrop);
  const backdropBlur = useSettingsStore((s) => s.markerDialogBackdropBlur);
  const legendCategories = useSettingsStore((s) => s.legendCategories);

  const hotspot = hotspots[index] ?? null;
  const count = hotspots.length;
  const category =
    hotspot?.category
      ? legendCategories.find((c) => c.id === hotspot.category) ?? null
      : null;

  const setPreviewActiveHotspotId = useUIStore((s) => s.setPreviewActiveHotspotId);
  const setPreviewLabelPending = useUIStore((s) => s.setPreviewLabelPending);
  const setHoverTooltip = useUIStore((s) => s.setHoverTooltip);
  const showLabelOnSelect = useSettingsStore((s) => s.previewShowLabelOnSelect);
  const resetCameraOnClose = useSettingsStore(
    (s) => s.markerDialogResetCameraOnClose,
  );

  const revealSelectLabel = useCallback(
    (hotspotId: number) => {
      setHoverTooltip(null);
      if (!showLabelOnSelect) {
        setPreviewLabelPending(false);
        return;
      }
      setPreviewLabelPending(true);
      window.setTimeout(() => {
        const state = useUIStore.getState();
        if (state.previewActiveHotspotId === hotspotId) {
          state.setPreviewLabelPending(false);
        }
      }, 280);
    },
    [showLabelOnSelect, setHoverTooltip, setPreviewLabelPending],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPreviewActiveHotspotId(null);
    setPreviewLabelPending(false);
    setHoverTooltip(null);
    if (resetCameraOnClose) {
      window.dispatchEvent(new CustomEvent("editor:reset-camera"));
    }
  }, [
    setOpen,
    setPreviewActiveHotspotId,
    setPreviewLabelPending,
    setHoverTooltip,
    resetCameraOnClose,
  ]);

  const goPrev = useCallback(() => {
    if (count === 0) return;
    const nextIndex = (index - 1 + count) % count;
    setIndex(nextIndex);
    const next = hotspots[nextIndex];
    if (next) {
      setPreviewActiveHotspotId(next.id);
      revealSelectLabel(next.id);
    }
  }, [
    count,
    index,
    setIndex,
    hotspots,
    setPreviewActiveHotspotId,
    revealSelectLabel,
  ]);

  const goNext = useCallback(() => {
    if (count === 0) return;
    const nextIndex = (index + 1) % count;
    setIndex(nextIndex);
    const next = hotspots[nextIndex];
    if (next) {
      setPreviewActiveHotspotId(next.id);
      revealSelectLabel(next.id);
    }
  }, [
    count,
    index,
    setIndex,
    hotspots,
    setPreviewActiveHotspotId,
    revealSelectLabel,
  ]);

  useEffect(() => {
    if (presentation === "off" && open) setOpen(false);
  }, [presentation, open, setOpen]);

  useEffect(() => {
    if (!open || !hotspot || presentation === "off") return;
    setPreviewActiveHotspotId(hotspot.id);
    window.dispatchEvent(
      new CustomEvent("editor:focus-hotspot", { detail: { id: hotspot.id } }),
    );
  }, [open, hotspot?.id, presentation, setPreviewActiveHotspotId]);

  useEffect(() => {
    if (!showLabelOnSelect) setHoverTooltip(null);
  }, [showLabelOnSelect, setHoverTooltip]);

  useEffect(() => {
    if (!open || presentation === "off") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, presentation, goPrev, goNext]);

  if (!hotspot) return null;

  const headerImage = hotspot.image.trim();
  const hasHeaderImage = headerImage.length > 0;

  const showTypeChip = hotspot.type !== "none";
  const typeChip = showTypeChip ? (
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
  ) : null;

  const closeButton = (
    <IconButton
      title="Close"
      style={{
        background: "rgba(11,20,36,0.7)",
        border: "1px solid var(--editor-line)",
        backdropFilter: "blur(8px)",
      }}
      onClick={close}
    >
      <X />
    </IconButton>
  );

  return (
    <EditorDialog
      open={open}
      onClose={close}
      presentation={presentation}
      size={size}
      backdrop={backdrop}
      backdropBlur={backdropBlur}
      className="editor-marker-dialog"
    >
      {hasHeaderImage ? (
        <EditorDialog.Media>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={headerImage} alt="" className="h-full w-full object-cover" />
          <div className="editor-marker-dialog-media-fade" />
          <div className="absolute right-3 top-3 z-10">{closeButton}</div>
          {typeChip ? (
            <div className="absolute bottom-3 left-5 flex items-center gap-2">
              {typeChip}
            </div>
          ) : null}
        </EditorDialog.Media>
      ) : null}

      <EditorDialog.Header
        title={hotspot.title}
        description={
          category ? <CategoryOptionBadge category={category} /> : undefined
        }
      >
        {!hasHeaderImage ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            {typeChip}
            {closeButton}
          </div>
        ) : null}
      </EditorDialog.Header>

      <EditorDialog.Body>
        <HotspotBlocksPreview blocks={hotspot.blocks} />
      </EditorDialog.Body>

      <EditorDialog.Footer>
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
      </EditorDialog.Footer>
    </EditorDialog>
  );
}
