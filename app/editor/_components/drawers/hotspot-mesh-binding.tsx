"use client";

import { AlertTriangle, MousePointerClick, Unlink } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { toast } from "@/lib/editor/toast";
import { getModelMeshCenter } from "@/lib/editor/engine/model-mesh-queries";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useMeshBinding } from "@/lib/editor/state/mesh-bindings";
import { useModelStore } from "@/lib/editor/state/model-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";

/**
 * General tab section for a mesh-click hotspot: which mesh triggers it, with
 * rebind / unbind. A missing mesh (model replaced or renamed) is flagged but
 * never cleared automatically, so re-importing the original restores it.
 */
export function HotspotMeshBindingSection({ selected }: { selected: Hotspot }) {
  const meshes = useModelStore((s) => s.meshes);
  const hotspots = useEditorStore((s) => s.hotspots);
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const status = useMeshBinding(selected);
  const meshId = selected.meshId ?? "";
  const current = meshes.find((mesh) => mesh.id === meshId);

  // One hotspot per mesh: hide meshes another hotspot already uses.
  const takenByOthers = new Set(
    hotspots
      .filter((hotspot) => hotspot.id !== selected.id && hotspot.meshId)
      .map((hotspot) => hotspot.meshId!),
  );
  const options = meshes.filter((mesh) => !takenByOthers.has(mesh.id));

  const rebind = (nextId: string) => {
    if (!nextId || nextId === meshId) return;
    const center = getModelMeshCenter(nextId);
    updateHotspot(selected.id, {
      meshId: nextId,
      ...(center ? { position: center } : {}),
    });
  };

  const unbind = () => {
    // Becomes a normal marker hotspot where the mesh is (or was).
    const center = getModelMeshCenter(meshId) ?? selected.position;
    updateHotspot(selected.id, { meshId: undefined, position: center });
    toast.success("Mesh unbound. This is now a marker hotspot");
  };

  return (
    <SettingsSection
      title="Clickable mesh"
      icon={<MousePointerClick className="h-3.5 w-3.5" />}
      defaultOpen
    >
      {status === "missing" ? (
        <div className="editor-mesh-binding-warning" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Mesh “{meshId}” isn’t in the current model, so this can’t be clicked.
            Pick another mesh or unbind it.
          </span>
        </div>
      ) : null}
      {status === "unsupported" ? (
        <p className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
          Mesh clicks only work in 3D model scenes.
        </p>
      ) : null}
      <div>
        <FieldLabel>Triggered by</FieldLabel>
        <select
          className="editor-select"
          value={current ? meshId : ""}
          disabled={status === "pending" || status === "unsupported"}
          onChange={(e) => rebind(e.target.value)}
        >
          {!current ? (
            <option value="" disabled>
              {status === "pending" ? "Loading model…" : `Missing: ${meshId}`}
            </option>
          ) : null}
          {options.map((mesh) => (
            <option key={mesh.id} value={mesh.id} title={mesh.id}>
              {mesh.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--editor-muted)" }}>
          Clicking this mesh in Preview runs this hotspot’s actions, the same as
          clicking a marker. A marker in front of the mesh wins.
        </p>
      </div>
      <EditorButton
        type="button"
        variant="ghost"
        className="w-full justify-center text-[12px]"
        title="Turn this into a normal marker hotspot"
        onClick={unbind}
      >
        <Unlink className="h-3.5 w-3.5" />
        Unbind mesh
      </EditorButton>
    </SettingsSection>
  );
}
