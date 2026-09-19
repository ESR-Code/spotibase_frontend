"use client";

import { useEffect, useState } from "react";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import {
  useActiveScene,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";

export function SceneMetadataSection() {
  const scene = useActiveScene();
  const updateSceneMeta = useScenesStore((s) => s.updateSceneMeta);
  const [name, setName] = useState(scene.name);

  useEffect(() => {
    setName(scene.name);
  }, [scene.id, scene.name]);

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
          onChange={(dataUrl) =>
            updateSceneMeta(scene.id, { thumbnailUrl: dataUrl })
          }
          uploadLabel="Upload thumbnail"
          emptyLabel="No thumbnail"
          hint="Shown in Scene Explorer. PNG / JPG / WebP / SVG, up to 2.5 MB."
          clearTitle="Remove thumbnail"
          successMessage="Thumbnail applied"
        />
      </div>
    </div>
  );
}
