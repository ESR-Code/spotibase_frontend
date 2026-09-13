"use client";

import { ChevronDown, ChevronUp, ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { createBlockId } from "@/lib/editor/blocks/create-block";
import {
  HOTSPOT_IMAGE_ACCEPT,
  ImageFileReadError,
  readImageFilesAsDataUrls,
} from "@/lib/editor/io/read-image-data-url";
import type { ImageBlock, ImageBlockItem } from "@/lib/editor/types/hotspot-block";

type ImageBlockEditorProps = {
  block: ImageBlock;
  onChange: (patch: Pick<ImageBlock, "items">) => void;
};

async function filesToItems(files: FileList | null): Promise<ImageBlockItem[]> {
  if (!files || files.length === 0) return [];
  try {
    const read = await readImageFilesAsDataUrls(files);
    return read.map((item) => ({
      id: createBlockId(),
      src: item.dataUrl,
      caption: "",
    }));
  } catch (error) {
    const message =
      error instanceof ImageFileReadError
        ? error.message
        : "Could not read image file";
    toast.error(message);
    return [];
  }
}

export function ImageBlockEditor({ block, onChange }: ImageBlockEditorProps) {
  const setItems = (items: ImageBlockItem[]) => onChange({ items });

  const handleFiles = async (files: FileList | null) => {
    const next = await filesToItems(files);
    if (next.length === 0) return;
    setItems([...block.items, ...next]);
    toast.success(
      next.length === 1 ? "Image added" : `${next.length} images added`,
    );
  };

  const updateCaption = (id: string, caption: string) => {
    setItems(
      block.items.map((item) =>
        item.id === id ? { ...item, caption } : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems(block.items.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, delta: number) => {
    const from = block.items.findIndex((item) => item.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= block.items.length) return;
    const next = [...block.items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {block.items.length === 0 ? (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-6 text-center"
          style={{
            border: "1px dashed var(--editor-line)",
            background: "rgba(11,20,36,0.35)",
          }}
        >
          <ImageIcon
            className="h-4 w-4"
            style={{ color: "var(--editor-muted-2)" }}
          />
          <span className="text-[12px] font-semibold">Upload images</span>
          <span
            className="text-[11px]"
            style={{ color: "var(--editor-muted)" }}
          >
            PNG / JPG / WebP / SVG / GIF, up to 2.5 MB each. Select more than
            one for a carousel.
          </span>
          <input
            type="file"
            accept={HOTSPOT_IMAGE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <>
          <div className="space-y-2">
            {block.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg p-2"
                style={{
                  border: "1px solid var(--editor-line-soft)",
                  background: "rgba(11,20,36,0.35)",
                }}
              >
                <div className="flex gap-2">
                  <div
                    className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md"
                    style={{
                      background: "var(--editor-input-bg)",
                      border: "1px solid var(--editor-line)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <FieldLabel className="mb-1">Caption</FieldLabel>
                    <input
                      className="editor-input"
                      value={item.caption}
                      placeholder="Optional"
                      onChange={(e) => updateCaption(item.id, e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-0.5">
                    <IconButton
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveItem(item.id, -1)}
                      style={{ width: 26, height: 26 }}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      title="Move down"
                      disabled={index === block.items.length - 1}
                      onClick={() => moveItem(item.id, 1)}
                      style={{ width: 26, height: 26 }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      title="Remove image"
                      onClick={() => removeItem(item.id)}
                      style={{ width: 26, height: 26, color: "#ff8a95" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <label className="editor-btn mb-0 cursor-pointer justify-center">
            <Upload className="h-4 w-4" />
            Add images
            <input
              type="file"
              accept={HOTSPOT_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}
