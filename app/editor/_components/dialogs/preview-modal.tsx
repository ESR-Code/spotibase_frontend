"use client";

import { resolveAssetSrc } from "@/lib/editor/assets";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, type ReactNode } from "react";
import { HotspotBlocksPreview } from "@/app/editor/_components/blocks/hotspot-blocks-preview";
import { CategoryOptionBadge } from "@/app/editor/_components/ui/category-option";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import {
  resolveSceneDialogPresentation,
  useActiveSceneDialog,
} from "@/lib/editor/dialogs/scene-dialogs";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import {
  resolveHotspotAppearance,
  usePreviewAppearanceStore,
} from "@/lib/editor/state/preview-appearance-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";
import { cn } from "@/lib/utils";

/** The Preview dialog slot: a scene dialog when one is the source, else the hotspot dialog. */
export function PreviewModal() {
  const dialogId = useUIStore((s) => s.previewDialogId);
  return dialogId ? (
    <SceneDialogPreviewModal dialogId={dialogId} />
  ) : (
    <HotspotPreviewModal />
  );
}

function HotspotPreviewModal() {
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
  const drawerInset = useSettingsStore((s) => s.markerDialogDrawerInset);
  const backdrop = useSettingsStore((s) => s.markerDialogBackdrop);
  const backdropBlur = useSettingsStore((s) => s.markerDialogBackdropBlur);
  const legendCategories = useSettingsStore((s) => s.legendCategories);

  const isInfoBox = presentation === "infobox";
  const previewActiveHotspotId = useUIStore((s) => s.previewActiveHotspotId);
  const hotspot =
    previewActiveHotspotId != null
      ? (hotspots.find((item) => item.id === previewActiveHotspotId) ?? null)
      : (hotspots[index] ?? null);
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
  const prevNextEnabled = useSettingsStore((s) => s.markerDialogPrevNext);
  const showPrevNext = prevNextEnabled !== false && count >= 2;

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
    if (!open || previewActiveHotspotId == null) return;
    const nextIndex = hotspots.findIndex(
      (item) => item.id === previewActiveHotspotId,
    );
    if (nextIndex < 0) {
      setOpen(false);
      setPreviewActiveHotspotId(null);
      setPreviewLabelPending(false);
      setHoverTooltip(null);
      setInfoBoxAnchor(null);
      return;
    }
    if (nextIndex !== index) setIndex(nextIndex);
  }, [
    open,
    previewActiveHotspotId,
    hotspots,
    index,
    setIndex,
    setOpen,
    setPreviewActiveHotspotId,
    setPreviewLabelPending,
    setHoverTooltip,
    setInfoBoxAnchor,
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
    if (!open || !showPrevNext) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, showPrevNext, goPrev, goNext]);

  if (!hotspot) return null;

  const displayHotspot = resolveHotspotAppearance(hotspot, isPreview);

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

  return (
    <EditorDialog
      open={open}
      onClose={close}
      presentation={presentation}
      size={size}
      inset={presentation === "drawer" && drawerInset}
      backdrop={isInfoBox ? false : backdrop}
      backdropBlur={isInfoBox ? false : backdropBlur}
      anchor={isInfoBox ? infoBoxAnchor : null}
      anchorVisible={infoBoxAnchor?.visible ?? true}
      className={cn(
        "editor-marker-dialog",
        "editor-preview-surface",
        isInfoBox && "editor-marker-infobox",
      )}
    >
      <PreviewDialogContent
        title={displayHotspot.title}
        image={hotspot.image}
        chip={typeChip}
        description={
          category ? <CategoryOptionBadge category={category} /> : undefined
        }
        blocks={hotspot.blocks}
        hotspotId={hotspot.id}
        isInfoBox={isInfoBox}
        onClose={close}
      />

      {showPrevNext ? (
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
      ) : null}
    </EditorDialog>
  );
}

/** A scene dialog (Open Modal with a dialog): no camera, prev/next or anchor. */
function SceneDialogPreviewModal({ dialogId }: { dialogId: string }) {
  const open = useUIStore((s) => s.previewModalOpen);
  const setOpen = useUIStore((s) => s.setPreviewModalOpen);
  const dialog = useActiveSceneDialog(dialogId);
  const scenePresentation = useSettingsStore((s) => s.markerDialogPresentation);
  const sceneSize = useSettingsStore((s) => s.markerDialogSize);
  const drawerInset = useSettingsStore((s) => s.markerDialogDrawerInset);
  const backdrop = useSettingsStore((s) => s.markerDialogBackdrop);
  const backdropBlur = useSettingsStore((s) => s.markerDialogBackdropBlur);
  const title = useInterpolatedPlainText(dialog?.title ?? "");

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Deleted, or the scene changed under it: close the slot.
  useEffect(() => {
    if (open && !dialog) setOpen(false);
  }, [open, dialog, setOpen]);

  if (!dialog) return null;
  const presentation = resolveSceneDialogPresentation(dialog, scenePresentation);

  return (
    <EditorDialog
      open={open}
      onClose={close}
      presentation={presentation}
      size={dialog.size ?? sceneSize}
      inset={presentation === "drawer" && drawerInset}
      backdrop={backdrop}
      backdropBlur={backdropBlur}
      className={cn("editor-marker-dialog", "editor-preview-surface")}
    >
      <PreviewDialogContent
        title={title}
        image={dialog.image}
        blocks={dialog.blocks}
        isInfoBox={false}
        onClose={close}
      />
    </EditorDialog>
  );
}

type PreviewDialogContentProps = {
  title: string;
  /** Header image ref (`asset:<id>` / URL); empty = no media. */
  image: string;
  chip?: ReactNode;
  description?: ReactNode;
  blocks: HotspotBlock[];
  hotspotId?: number;
  isInfoBox: boolean;
  onClose: () => void;
};

/** Header media, title row and block body shared by hotspot and scene dialogs. */
function PreviewDialogContent({
  title,
  image,
  chip,
  description,
  blocks,
  hotspotId,
  isInfoBox,
  onClose,
}: PreviewDialogContentProps) {
  const headerImage = resolveAssetSrc(image.trim());
  const hasHeaderImage = headerImage.length > 0;

  const closeButton = (
    <IconButton
      title="Close"
      className={hasHeaderImage ? "editor-marker-dialog-close" : undefined}
      onClick={onClose}
    >
      <X />
    </IconButton>
  );

  return (
    <>
      {hasHeaderImage ? (
        <EditorDialog.Media
          className={isInfoBox ? "editor-dialog-media-infobox" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={headerImage} alt="" className="h-full w-full object-cover" />
          <div className="editor-marker-dialog-media-fade" />
          <div className="absolute right-3 top-3 z-10">{closeButton}</div>
          {chip ? (
            <div
              className={cn(
                "absolute flex items-center gap-2",
                isInfoBox ? "bottom-2 left-3" : "bottom-3 left-5",
              )}
            >
              {chip}
            </div>
          ) : null}
        </EditorDialog.Media>
      ) : null}

      <EditorDialog.Header title={title} description={description}>
        {!hasHeaderImage ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            {chip}
            {closeButton}
          </div>
        ) : null}
      </EditorDialog.Header>

      <EditorDialog.Body>
        <HotspotBlocksPreview blocks={blocks} hotspotId={hotspotId} />
      </EditorDialog.Body>
    </>
  );
}
