"use client";

import { Camera, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { assetRef, uploadAsset } from "@/lib/editor/assets";
import {
  captureActiveViewport,
  dataUrlToJpegFile,
} from "@/lib/editor/engine/viewport-capture";
import {
  useActiveScene,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";
import { toast } from "@/lib/editor/toast";

export function SceneMetadataSection() {
  const scene = useActiveScene();
  const updateSceneMeta = useScenesStore((s) => s.updateSceneMeta);
  const [name, setName] = useState(scene.name);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    setName(scene.name);
  }, [scene.id, scene.name]);

  const useScreenshot = () => {
    if (capturing) return;
    setCapturing(true);
    let file: File;
    try {
      const dataUrl = captureActiveViewport();
      if (!dataUrl) {
        toast.error("Could not capture the viewport");
        setCapturing(false);
        return;
      }
      file = dataUrlToJpegFile(dataUrl, "scene-thumbnail.jpg");
    } catch {
      toast.error("Could not capture the viewport");
      setCapturing(false);
      return;
    }

    const sceneId = scene.id;
    void uploadAsset(file, {
      kind: "image",
      sceneId,
      name: `${scene.name} thumbnail`,
    })
      .then((asset) => {
        updateSceneMeta(sceneId, { thumbnailUrl: assetRef(asset.id) });
        toast.success("Thumbnail applied");
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Could not upload thumbnail",
        );
      })
      .finally(() => setCapturing(false));
  };

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(scene.name);
      return;
    }
    if (trimmed !== scene.name) {
      updateSceneMeta(scene.id, { name: trimmed });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel htmlFor="scene-meta-name">Scene name</FieldLabel>
        <input
          id="scene-meta-name"
          className="editor-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setName(scene.name);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
      <div>
        <FieldLabel htmlFor="scene-meta-description">Description</FieldLabel>
        <textarea
          id="scene-meta-description"
          className="editor-textarea"
          rows={3}
          placeholder="Optional"
          value={scene.description}
          onChange={(e) =>
            updateSceneMeta(scene.id, { description: e.target.value })
          }
        />
      </div>
      <div>
        <FieldLabel>Thumbnail</FieldLabel>
        <HotspotImageField
          layout="split"
          value={scene.thumbnailUrl}
          onChange={(value) =>
            updateSceneMeta(scene.id, { thumbnailUrl: value })
          }
          uploadLabel="Upload thumbnail"
          emptyLabel="No thumbnail"
          hint="Shown in Scene Explorer. PNG / JPG / WebP / SVG / GIF, up to 25 MB."
          clearTitle="Remove thumbnail"
          successMessage="Thumbnail applied"
          extraActions={
            <button
              type="button"
              className="editor-btn mb-0 w-full justify-center"
              disabled={capturing}
              onClick={useScreenshot}
            >
              {capturing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {capturing ? "Capturing…" : "Use screenshot"}
            </button>
          }
        />
      </div>
    </div>
  );
}
