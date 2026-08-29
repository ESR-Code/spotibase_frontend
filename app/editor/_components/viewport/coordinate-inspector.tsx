"use client";

import { useState } from "react";
import { Crosshair } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import {
  geoToScene,
  geoToWorld,
  sceneToGeo,
  sceneToWorld,
} from "@/lib/editor/coords";
import { normalizeGeoPoint } from "@/lib/editor/coords/enu";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useCoordsInspectorStore } from "@/lib/editor/state/coords-inspector-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";

function fmt(n: number, digits: number): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

/** Collapsible inspect panel in the Subject tab after a scene is aligned. */
export function CoordinateInspector() {
  const scene = useActiveScene();
  const isPreview = useEditorStore((s) => s.isPreview);
  const aligning = useAlignmentSessionStore((s) => s.open);
  const clickInspectEnabled = useCoordsInspectorStore((s) => s.clickInspectEnabled);
  const setClickInspectEnabled = useCoordsInspectorStore(
    (s) => s.setClickInspectEnabled,
  );
  const local = useCoordsInspectorStore((s) => s.local);
  const reverseLocal = useCoordsInspectorStore((s) => s.reverseLocal);
  const reverseError = useCoordsInspectorStore((s) => s.reverseError);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [alt, setAlt] = useState("0");

  const aligned = isAlignedGeoReference(scene.geoReference);
  const lookup =
    aligned && local
      ? {
          world: sceneToWorld(scene.id, local),
          geo: sceneToGeo(scene.id, local),
        }
      : null;

  if (isPreview || aligning || !aligned) return null;

  const convertReverse = () => {
    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);
    const altitude = Number.parseFloat(alt);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      useCoordsInspectorStore.getState().setReverseResult({
        geo: { latitude: 0, longitude: 0, altitude: 0 },
        local: null,
        world: null,
        error: "Enter a valid latitude and longitude",
      });
      return;
    }
    const geo = normalizeGeoPoint({
      latitude,
      longitude,
      altitude: Number.isFinite(altitude) ? altitude : 0,
    });
    const localResult = geoToScene(scene.id, geo);
    const world = localResult.ok
      ? geoToWorld(geo, scene.geoReference!.origin)
      : null;
    useCoordsInspectorStore.getState().setReverseResult({
      geo,
      local: localResult.ok ? localResult.local : null,
      world,
      error: localResult.ok ? null : localResult.error,
    });
  };

  return (
    <SettingsSection
      title="Inspect/debug coords"
      icon={<Crosshair className="h-3.5 w-3.5" />}
    >
      <SwitchField
        label="Click to inspect"
        description="Off after alignment. When on, click the scene to drop a debug marker and read coordinates."
        checked={clickInspectEnabled}
        onChange={setClickInspectEnabled}
      />
      {local && lookup ? (
        <div className="editor-coords-grid">
          <div>
            <div className="editor-coords-k">Scene</div>
            <div>X {fmt(local.x, 3)}</div>
            <div>Y {fmt(local.y, 3)}</div>
            <div>Z {fmt(local.z, 3)}</div>
          </div>
          <div>
            <div className="editor-coords-k">ENU (m)</div>
            {lookup.world.ok ? (
              <>
                <div>E {fmt(lookup.world.world.x, 2)}</div>
                <div>N {fmt(lookup.world.world.y, 2)}</div>
                <div>U {fmt(lookup.world.world.z, 2)}</div>
              </>
            ) : (
              <div style={{ color: "var(--editor-crimson-2)" }}>
                {lookup.world.error}
              </div>
            )}
          </div>
          <div>
            <div className="editor-coords-k">Geographic</div>
            {lookup.geo.ok ? (
              <>
                <div>Lat {fmt(lookup.geo.geo.latitude, 6)}</div>
                <div>Lon {fmt(lookup.geo.geo.longitude, 6)}</div>
                <div>Alt {fmt(lookup.geo.geo.altitude, 2)} m</div>
              </>
            ) : (
              <div style={{ color: "var(--editor-crimson-2)" }}>
                {lookup.geo.error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-[11px]" style={{ color: "var(--editor-muted-2)" }}>
          {clickInspectEnabled
            ? "Click the scene to read that location as scene XYZ and latitude / longitude."
            : "Click inspect is off — no debug marker will be placed."}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--editor-line-soft)" }} className="pt-2">
        <div
          className="mb-1 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Look up a map coordinate
        </div>
        <div className="grid grid-cols-3 gap-1">
          <label>
            <FieldLabel>Lat</FieldLabel>
            <input
              className="editor-input"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            <FieldLabel>Lon</FieldLabel>
            <input
              className="editor-input"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            <FieldLabel>Alt m</FieldLabel>
            <input
              className="editor-input"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>
        <EditorButton
          type="button"
          className="mt-1.5 w-full justify-center text-[11px]"
          onClick={convertReverse}
        >
          Find in this scene
        </EditorButton>
        {reverseError ? (
          <div
            className="mt-1 text-[10px]"
            style={{ color: "var(--editor-crimson-2)" }}
          >
            {reverseError}
          </div>
        ) : reverseLocal ? (
          <div
            className="mt-1 font-mono text-[10px]"
            style={{ color: "var(--editor-muted)" }}
          >
            Scene X {fmt(reverseLocal.x, 3)} · Y {fmt(reverseLocal.y, 3)} · Z{" "}
            {fmt(reverseLocal.z, 3)}
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
