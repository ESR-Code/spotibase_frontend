"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { HotspotBlocksPreview } from "@/app/editor/_components/blocks/hotspot-blocks-preview";
import { CategoryOptionBadge } from "@/app/editor/_components/ui/category-option";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import {
  resolveHotspotAppearance,
  usePreviewAppearanceStore,
} from "@/lib/editor/state/preview-appearance-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { cn } from "@/lib/utils";

export function PreviewModal() {
  const open = useUIStore((s) => s.previewModalOpen);
  const index = useUIStore((s) => s.previewModalIndex);
  const setOpen = useUIStore((s) => s.setPreviewModalOpen);
  const setIndex = useUIStore((s) => s.setPreviewModalIndex);
  const infoBoxAnchor = useUIStore((s) => s.infoBoxAnchor);
  const setInfoBoxAnchor = useUIStore((s) => s.setInfoBoxAnchor);
  const hotspots = usePreviewHotspots();
  const isPreview = useEditorStore((s) => s.isPreview);
  usePreviewAppearanceStore((s) => s.overrides);
  const presentation = useSettingsStore((s) => s.markerDialogPresentation);
  const size = useSettingsStore((s) => s.markerDialogSize);
  const backdrop = useSettingsStore((s) => s.markerDialogBackdrop);
  const backdropBlur = useSettingsStore((s) => s.markerDialogBackdropBlur);
  const legendCategories = useSettingsStore((s) => s.legendCategories);

  const isInfoBox = presentation === "infobox";
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
      if (!showLabelOnSelect || isInfoBox) {
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
    [showLabelOnSelect, isInfoBox, setHoverTooltip, setPreviewLabelPending],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPreviewActiveHotspotId(null);
    setPreviewLabelPending(false);
    setHoverTooltip(null);
    setInfoBoxAnchor(null);
    if (resetCameraOnClose) {
      window.dispatchEvent(new CustomEvent("editor:reset-camera"));
    }
  }, [
    setOpen,
    setPreviewActiveHotspotId,
    setPreviewLabelPending,
    setHoverTooltip,
    setInfoBoxAnchor,
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
    if (!open || !hotspot) return;
    setPreviewActiveHotspotId(hotspot.id);
    window.dispatchEvent(
      new CustomEvent("editor:focus-hotspot", { detail: { id: hotspot.id } }),
    );
  }, [open, hotspot?.id, setPreviewActiveHotspotId]);

  useEffect(() => {
    if (!showLabelOnSelect || isInfoBox) setHoverTooltip(null);
  }, [showLabelOnSelect, isInfoBox, setHoverTooltip]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  if (!hotspot) return null;

  const displayHotspot = resolveHotspotAppearance(hotspot, isPreview);
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
      className={hasHeaderImage ? "editor-marker-dialog-close" : undefined}
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
      backdrop={isInfoBox ? false : backdrop}
      backdropBlur={isInfoBox ? false : backdropBlur}
      anchor={isInfoBox ? infoBoxAnchor : null}
      anchorVisible={infoBoxAnchor?.visible ?? true}
      className={cn(
        "editor-marker-dialog",
        isInfoBox && "editor-marker-infobox",
      )}
    >
      {hasHeaderImage ? (
        <EditorDialog.Media
          className={isInfoBox ? "editor-dialog-media-infobox" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={headerImage} alt="" className="h-full w-full object-cover" />
          <div className="editor-marker-dialog-media-fade" />
          <div className="absolute right-3 top-3 z-10">{closeButton}</div>
          {typeChip ? (
            <div
              className={cn(
                "absolute flex items-center gap-2",
                isInfoBox ? "bottom-2 left-3" : "bottom-3 left-5",
              )}
            >
              {typeChip}
            </div>
          ) : null}
        </EditorDialog.Media>
      ) : null}

      <EditorDialog.Header
        title={displayHotspot.title}
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
        <HotspotBlocksPreview
          blocks={hotspot.blocks}
          hotspotId={hotspot.id}
        />
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
