"use client";

import { Boxes, MousePointerClick, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { toast } from "@/lib/editor/toast";
import { getModelMeshCenter } from "@/lib/editor/engine/model-mesh-queries";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { selectHotspotExclusive } from "@/lib/editor/state/exclusive-selection";
import { authoredHotspotForMesh } from "@/lib/editor/state/mesh-bindings";
import { useModelStore, type ModelMeshEntry } from "@/lib/editor/state/model-store";
import { usePreviewMeshHighlightStore } from "@/lib/editor/state/preview-mesh-highlight-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/** Open the Hotspot Editor on a hotspot (same as clicking its marker). */
function openHotspotEditor(id: number) {
  selectHotspotExclusive(id);
  useUIStore.getState().setPropertiesDrawerOpen(true);
}

/**
 * Model meshes with a "Make clickable" action. A clickable mesh is a hotspot
 * bound to that mesh (`Hotspot.meshId`): same blocks, actions and Open Modal,
 * triggered by clicking the mesh in Preview instead of a marker.
 */
export function SubjectMeshList() {
  const meshes = useModelStore((s) => s.meshes);
  const hotspots = useEditorStore((s) => s.hotspots);
  const isPreview = useEditorStore((s) => s.isPreview);
  const setHoverMeshId = usePreviewMeshHighlightStore((s) => s.setHoverMeshId);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meshes;
    return meshes.filter(
      (mesh) =>
        mesh.name.toLowerCase().includes(q) || mesh.id.toLowerCase().includes(q),
    );
  }, [meshes, query]);

  const clickableCount = useMemo(
    () => meshes.filter((mesh) => authoredHotspotForMesh(hotspots, mesh.id)).length,
    [hotspots, meshes],
  );

  if (meshes.length === 0) return null;

  const makeClickable = (mesh: ModelMeshEntry) => {
    const existing = authoredHotspotForMesh(useEditorStore.getState().hotspots, mesh.id);
    if (existing) {
      openHotspotEditor(existing.id);
      return;
    }
    const center = getModelMeshCenter(mesh.id) ?? { x: 0, y: 0, z: 0 };
    const created = useEditorStore.getState().addHotspot(center, {
      title: mesh.name,
      legendName: mesh.name,
      meshId: mesh.id,
    });
    openHotspotEditor(created.id);
    toast.success(`“${mesh.name}” is now clickable`);
  };

  return (
    <SettingsSection
      title={`Meshes · ${meshes.length}`}
      icon={<Boxes className="h-3.5 w-3.5" />}
    >
      <p className="text-[11px] leading-snug" style={{ color: "var(--editor-muted)" }}>
        Make a part of the model clickable in Preview. It gets the same content,
        actions and modal as a hotspot.
        {clickableCount > 0 ? ` ${clickableCount} clickable.` : ""}
      </p>
      {meshes.length > 6 ? (
        <input
          className="editor-input"
          placeholder="Search meshes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      ) : null}
      <div
        className="editor-subject-mesh-list"
        onPointerLeave={() => setHoverMeshId(null)}
      >
        {filtered.length === 0 ? (
          <div className="px-2 py-2 text-[11px]" style={{ color: "var(--editor-muted)" }}>
            No meshes match
          </div>
        ) : (
          filtered.map((mesh) => {
            const bound = authoredHotspotForMesh(hotspots, mesh.id);
            return (
              <div
                key={mesh.id}
                className={`editor-subject-mesh-row ${bound ? "is-clickable" : ""}`}
                onPointerEnter={() => setHoverMeshId(mesh.id)}
              >
                <span className="min-w-0 flex-1 truncate" title={mesh.id}>
                  {mesh.name}
                </span>
                <button
                  type="button"
                  className="editor-subject-mesh-action"
                  disabled={isPreview}
                  title={
                    bound
                      ? `Edit “${bound.title}”`
                      : "Make this mesh clickable in Preview"
                  }
                  onClick={() => makeClickable(mesh)}
                >
                  {bound ? (
                    <>
                      <PencilLine className="h-3 w-3" />
                      Edit
                    </>
                  ) : (
                    <>
                      <MousePointerClick className="h-3 w-3" />
                      Make clickable
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </SettingsSection>
  );
}
