"use client";

import "@/lib/editor/geo/init-maplibre";
import { useEffect, useMemo, useState } from "react";
import { Globe, MapPin, X } from "lucide-react";
import {
  Map,
  MapMarker,
  MapRoute,
  MarkerContent,
  useMap,
  type MapViewport,
} from "@/components/ui/map";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { geoMapProjection } from "@/lib/editor/geo/map-projection";
import { geoMapStyleUrls } from "@/lib/editor/geo/map-styles";
import { resolveGeoHomeViewport } from "@/lib/editor/geo/resolve-home-viewport";
import type { Scene } from "@/lib/editor/types/scene";
import {
  alignmentStepLabel,
  type AlignmentWaitingFor,
  type DraftControlPoint,
  useAlignmentSessionStore,
} from "@/lib/editor/state/alignment-session-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { requiredControlPointCount } from "@/lib/editor/types/geo-reference";

function AlignmentMapClickBridge() {
  const waitingFor = useAlignmentSessionStore((s) => s.waitingFor);
  const pickGeo = useAlignmentSessionStore((s) => s.pickGeo);
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const onClick = (event: { lngLat: { lng: number; lat: number } }) => {
      if (useAlignmentSessionStore.getState().waitingFor !== "geo") return;
      pickGeo({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        altitude: 0,
      });
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, isLoaded, pickGeo]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    map.resize();
    map.getCanvas().style.cursor = waitingFor === "geo" ? "crosshair" : "";
  }, [map, isLoaded, waitingFor]);

  return null;
}

function AlignmentMap() {
  const geoSceneId = useAlignmentSessionStore((s) => s.geoSceneId);
  const points = useAlignmentSessionStore((s) => s.points);
  const waitingFor = useAlignmentSessionStore((s) => s.waitingFor);
  const geoScene = useScenesStore((s) =>
    s.scenes.find((scene) => scene.id === geoSceneId),
  );

  if (!geoScene || geoScene.type !== "geo") {
    return (
      <div className="editor-georef-map-empty">
        Select a Geo Map scene to pick corresponding points.
      </div>
    );
  }

  return (
    <AlignmentMapView
      key={geoScene.id}
      geoScene={geoScene}
      points={points}
      waitingFor={waitingFor}
    />
  );
}

function AlignmentMapView({
  geoScene,
  points,
  waitingFor,
}: {
  geoScene: Scene;
  points: DraftControlPoint[];
  waitingFor: AlignmentWaitingFor;
}) {
  const home = useMemo(
    () =>
      resolveGeoHomeViewport(geoScene.settings.resetPosition, {
        start: geoScene.geo.start,
        startZoom: geoScene.geo.startZoom,
      }),
    [geoScene],
  );
  const [viewport, setViewport] = useState<MapViewport>(home);
  const mapStyles = useMemo(
    () => geoMapStyleUrls(geoScene.geo.mapStyleId),
    [geoScene.geo.mapStyleId],
  );

  const geos = points
    .map((p) => p.geo)
    .filter((g): g is NonNullable<typeof g> => g != null);
  const line: [number, number][] = geos.map((g) => [g.longitude, g.latitude]);

  return (
    <div
      className={`editor-georef-map ${waitingFor === "geo" ? "is-waiting" : ""}`}
    >
      <Map
        theme="dark"
        styles={mapStyles}
        projection={geoMapProjection(geoScene.geo.flatProjection)}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        viewport={viewport}
        onViewportChange={setViewport}
      >
        <AlignmentMapClickBridge />
        {line.length >= 2 ? (
          <MapRoute
            coordinates={line}
            color="#3fb8af"
            width={2}
            interactive={false}
          />
        ) : null}
        {points.map((p, i) =>
          p.geo ? (
            <MapMarker
              key={p.id}
              longitude={p.geo.longitude}
              latitude={p.geo.latitude}
            >
              <MarkerContent>
                <div className="editor-align-marker editor-align-marker-alignment editor-align-marker-map">
                  {i + 1}
                </div>
              </MarkerContent>
            </MapMarker>
          ) : null,
        )}
      </Map>
    </div>
  );
}

function fmt(n: number, digits: number): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function GeoreferenceModal() {
  const open = useAlignmentSessionStore((s) => s.open);
  const phase = useAlignmentSessionStore((s) => s.phase);
  const method = useAlignmentSessionStore((s) => s.method);
  const points = useAlignmentSessionStore((s) => s.points);
  const waitingFor = useAlignmentSessionStore((s) => s.waitingFor);
  const preview = useAlignmentSessionStore((s) => s.preview);
  const selectGeoScene = useAlignmentSessionStore((s) => s.selectGeoScene);
  const undoLast = useAlignmentSessionStore((s) => s.undoLast);
  const resetPoints = useAlignmentSessionStore((s) => s.resetPoints);
  const apply = useAlignmentSessionStore((s) => s.apply);
  const cancel = useAlignmentSessionStore((s) => s.cancel);
  const sceneId = useAlignmentSessionStore((s) => s.sceneId);
  const scenes = useScenesStore((s) => s.scenes);
  const geoScenes = scenes.filter((s) => s.type === "geo");
  const hasSavedAlignment = Boolean(
    scenes.find((scene) => scene.id === sceneId)?.geoReference,
  );

  const title =
    method === "3-point" ? "3 Point Alignment" : "2 Point Alignment";
  const filled = points.filter((p) => p.local && p.geo).length;
  const needed = method ? requiredControlPointCount(method) : 0;
  const allCleared = points.every((p) => !p.local && !p.geo);
  const canApply =
    (preview?.ok === true && filled === needed) ||
    (allCleared && hasSavedAlignment);
  const canUndo = points.some((p) => p.local || p.geo);

  return (
    <EditorDialog
      open={open}
      onClose={cancel}
      presentation="drawer"
      side="right"
      size="large"
      backdrop={false}
      className="editor-georef-drawer"
    >
      <EditorDialog.Header
        title="Georeference Scene"
        description={
          phase === "select-geo"
            ? "Choose the Geo Map this scene should align to."
            : alignmentStepLabel(method, waitingFor, points)
        }
      >
        <IconButton title="Close" onClick={cancel}>
          <X />
        </IconButton>
      </EditorDialog.Header>

      <EditorDialog.Body className="editor-georef-body">
        {phase === "select-geo" ? (
          <div className="space-y-2">
            {geoScenes.length === 0 ? (
              <p className="text-[12px]" style={{ color: "var(--editor-muted)" }}>
                A Geo Map scene is required before a 2D or 3D scene can be
                georeferenced.
              </p>
            ) : (
              geoScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className="editor-georef-scene-btn"
                  onClick={() => selectGeoScene(scene.id)}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {scene.name}
                    </span>
                    <span
                      className="block text-[10px]"
                      style={{ color: "var(--editor-muted-2)" }}
                    >
                      {scene.geo.start
                        ? `${scene.geo.start.lat.toFixed(4)}, ${scene.geo.start.lng.toFixed(4)}`
                        : "World globe"}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[13px] font-semibold">{title}</div>
              <button
                type="button"
                className="text-[11px] underline-offset-2 hover:underline"
                style={{ color: "var(--editor-teal)" }}
                onClick={() =>
                  useAlignmentSessionStore.setState({
                    phase: "select-geo",
                    waitingFor: "local",
                  })
                }
              >
                Change map
              </button>
            </div>
            <AlignmentMap />
            <ol className="editor-georef-steps">
              {points.map((p, i) => {
                const isCurrent =
                  (waitingFor === "local" && !p.local) ||
                  (waitingFor === "geo" && p.local && !p.geo &&
                    points.findIndex((x) => x.local && !x.geo) === i);
                return (
                  <li
                    key={p.id}
                    className={isCurrent ? "is-current" : ""}
                  >
                    <span className="editor-georef-step-n">{i + 1}</span>
                    <span>
                      {p.local
                        ? `Scene ${p.local.x.toFixed(2)}, ${p.local.y.toFixed(2)}, ${p.local.z.toFixed(2)}`
                        : "Waiting for scene point"}
                      <br />
                      {p.geo
                        ? `Map ${p.geo.latitude.toFixed(5)}, ${p.geo.longitude.toFixed(5)}`
                        : "Waiting for map point"}
                    </span>
                  </li>
                );
              })}
            </ol>
            {preview ? (
              <div className="editor-georef-preview">
                {preview.ok && preview.transform && preview.origin ? (
                  <>
                    <div>Origin {fmt(preview.origin.latitude, 6)}, {fmt(preview.origin.longitude, 6)}</div>
                    <div>
                      Translate E {fmt(preview.transform.translation.x, 2)} · N{" "}
                      {fmt(preview.transform.translation.y, 2)} · U{" "}
                      {fmt(preview.transform.translation.z, 2)}
                    </div>
                    <div>
                      Rotate {fmt(preview.transform.rotationDeg.x, 1)}° /{" "}
                      {fmt(preview.transform.rotationDeg.y, 1)}° /{" "}
                      {fmt(preview.transform.rotationDeg.z, 1)}°
                    </div>
                    <div>Scale {fmt(preview.transform.scale, 4)}×</div>
                    <div>RMS residual {fmt(preview.residualRms ?? 0, 3)} m</div>
                  </>
                ) : (
                  <div style={{ color: "var(--editor-crimson-2)" }}>
                    {preview.error}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
                <MapPin className="mr-1 inline h-3 w-3" />
                {waitingFor === "local"
                  ? "Click the model or floorplan in the main viewport."
                  : waitingFor === "geo"
                    ? "Click the corresponding location on this map."
                    : "All points collected."}
              </div>
            )}
          </div>
        )}
      </EditorDialog.Body>

      <EditorDialog.Footer>
        <EditorButton type="button" variant="ghost" onClick={cancel}>
          Cancel
        </EditorButton>
        {phase === "align" ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            <EditorButton
              type="button"
              variant="ghost"
              disabled={!canUndo}
              onClick={undoLast}
            >
              Undo Last Point
            </EditorButton>
            <EditorButton type="button" variant="ghost" onClick={resetPoints}>
              Reset Alignment
            </EditorButton>
            <EditorButton
              type="button"
              variant="primary"
              disabled={!canApply}
              onClick={() => apply()}
            >
              Apply Alignment
            </EditorButton>
          </div>
        ) : null}
      </EditorDialog.Footer>
    </EditorDialog>
  );
}
