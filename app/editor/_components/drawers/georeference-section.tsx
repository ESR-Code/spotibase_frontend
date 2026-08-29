"use client";

import { Globe, MapPinned } from "lucide-react";
import { toast } from "sonner";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useScenesStore, useActiveScene } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";

function fmt(n: number, digits: number): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function openGeoreferenceWorkflow(sceneId: string) {
  useUIStore.getState().setSettingsDrawerOpen(false);
  useUIStore.getState().setPropertiesDrawerOpen(false);
  useUIStore.getState().setGeneralSettingsDrawerOpen(false);
  useAlignmentSessionStore.getState().begin(sceneId);
}

export function GeoreferenceSection() {
  const scene = useActiveScene();
  const scenes = useScenesStore((s) => s.scenes);
  const setSceneGeoReference = useScenesStore((s) => s.setSceneGeoReference);
  const geoScenes = scenes.filter((s) => s.type === "geo");
  const ref = scene.geoReference;
  const geoName =
    scenes.find((s) => s.id === ref?.geoSceneId)?.name ?? ref?.geoSceneId ?? "—";
  const aligned = isAlignedGeoReference(ref);
  const disabled = geoScenes.length === 0;

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] leading-snug" style={{ color: "var(--editor-muted)" }}>
        Align this scene to a Geo Map using control points. Local XYZ stays
        unchanged; geographic conversion is applied externally.
      </p>
      {disabled ? (
        <p className="text-[11px]" style={{ color: "var(--editor-crimson-2)" }}>
          Add a Geo Map scene first. At least one Geo Map is required before a
          2D or 3D scene can be georeferenced.
        </p>
      ) : null}
      <EditorButton
        type="button"
        className="w-full justify-center text-[12.5px]"
        disabled={disabled}
        onClick={() => openGeoreferenceWorkflow(scene.id)}
      >
        <MapPinned className="h-4 w-4" />
        Georeference Scene
      </EditorButton>

      {ref ? (
        <div className="editor-georef-status">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Globe className="h-3.5 w-3.5" />
            {aligned ? "Aligned" : "Invalid"}
          </div>
          <div>Map: {geoName}</div>
          <div>
            Origin {fmt(ref.origin.latitude, 6)}, {fmt(ref.origin.longitude, 6)}{" "}
            · alt {fmt(ref.origin.altitude, 2)} m
          </div>
          <div>
            Translate E {fmt(ref.transform.translation.x, 2)} · N{" "}
            {fmt(ref.transform.translation.y, 2)} · U{" "}
            {fmt(ref.transform.translation.z, 2)}
          </div>
          <div>
            Rotate {fmt(ref.transform.rotationDeg.x, 1)}° /{" "}
            {fmt(ref.transform.rotationDeg.y, 1)}° /{" "}
            {fmt(ref.transform.rotationDeg.z, 1)}°
          </div>
          <div>Scale {fmt(ref.transform.scale, 4)}×</div>
          <div>Method {ref.alignmentMethod}</div>
          <div>
            Points{" "}
            {ref.controlPoints
              .map(
                (p, i) =>
                  `${i + 1}: (${p.local.x.toFixed(2)}, ${p.local.y.toFixed(2)}, ${p.local.z.toFixed(2)})`,
              )
              .join(" · ")}
          </div>
          {ref.error ? (
            <div style={{ color: "var(--editor-crimson-2)" }}>{ref.error}</div>
          ) : null}
          <EditorButton
            type="button"
            variant="ghost"
            className="mt-1 w-full justify-center text-[11px]"
            onClick={() => {
              setSceneGeoReference(scene.id, null);
              toast.success("Alignment cleared");
            }}
          >
            Clear alignment
          </EditorButton>
        </div>
      ) : null}
    </div>
  );
}
