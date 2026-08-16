"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "sonner";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { defaultOverlayWidthMeters } from "@/lib/editor/geo/overlay-quad";
import {
  OVERLAY_ACCEPT,
  readOverlayImageFile,
} from "@/lib/editor/io/import-overlay-image";
import { selectLayerExclusive } from "@/lib/editor/state/exclusive-selection";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useMapViewportStore } from "@/lib/editor/state/map-viewport-store";
import { syncActiveSceneLayers } from "@/lib/editor/state/scenes-store";
import { isGeoImageOverlay } from "@/lib/editor/types/scene-layer";

function persistLayers() {
  syncActiveSceneLayers();
}

export function LayersPanel() {
  const layers = useLayersStore((s) => s.layers);
  const selectedId = useLayersStore((s) => s.selectedId);
  const inputRef = useRef<HTMLInputElement>(null);
  const listed = [...layers].reverse();

  const addFromFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await readOverlayImageFile(file);
      const viewport = useMapViewportStore.getState();
      const wrap = document.getElementById("editor-viewport-wrap");
      const widthMeters = defaultOverlayWidthMeters(
        viewport.center[1],
        viewport.zoom,
        wrap?.clientWidth ?? 800,
      );
      useLayersStore.getState().addLayer({
        kind: "image-overlay",
        name: image.name,
        visible: true,
        locked: false,
        opacity: 1,
        blend: 0,
        imageDataUrl: image.dataUrl,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        pose: {
          space: "geo",
          lng: viewport.center[0],
          lat: viewport.center[1],
          widthMeters,
          bearing: 0,
        },
      });
      persistLayers();
      toast.success("Overlay added — drag it on the map to position");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add overlay");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          color: "var(--editor-muted-2)",
          background: "rgba(11,20,36,0.4)",
          borderBottom: "1px solid var(--editor-line-soft)",
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          Image overlays
        </span>
        <IconButton
          title="Add overlay image"
          onClick={() => inputRef.current?.click()}
        >
          <Plus className="h-3.5 w-3.5" />
        </IconButton>
        <input
          ref={inputRef}
          type="file"
          accept={OVERLAY_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void addFromFile(file);
          }}
        />
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {listed.length === 0 ? (
          <div className="editor-empty-state">
            <ImageIcon
              className="mx-auto mb-2 h-8 w-8"
              style={{ color: "var(--editor-line)" }}
            />
            <div className="mb-1 text-[12px] font-semibold">
              Add a PNG or JPG overlay
            </div>
            <div className="text-[11px]">
              Drop a top-view site photo onto the globe, then position it with the
              on-map handles.
            </div>
          </div>
        ) : (
          listed.map((layer, visualIndex) => {
            const selected = layer.id === selectedId;
            const zIndex = layers.length - visualIndex;
            const canRaise = visualIndex > 0;
            const canLower = visualIndex < listed.length - 1;
            return (
              <div key={layer.id}>
                <div
                  className={`editor-hot-item ${selected ? "selected" : ""}`}
                  onClick={() => selectLayerExclusive(layer.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") selectLayerExclusive(layer.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="editor-layer-thumb">
                    {layer.kind === "image-overlay" ? (
                      <img src={layer.imageDataUrl} alt="" draggable={false} />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold">
                      {layer.name}
                    </div>
                    <div
                      className="text-[10.5px] uppercase tracking-wider"
                      style={{ color: "var(--editor-muted-2)" }}
                    >
                      Overlay · z{zIndex}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="editor-btn-ghost rounded p-1"
                    title={layer.visible ? "Hide overlay" : "Show overlay"}
                    onClick={(event) => {
                      event.stopPropagation();
                      useLayersStore.getState().updateLayer(layer.id, {
                        visible: !layer.visible,
                      });
                      persistLayers();
                    }}
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="editor-btn-ghost rounded p-1"
                    title={layer.locked ? "Unlock overlay" : "Lock overlay"}
                    onClick={(event) => {
                      event.stopPropagation();
                      useLayersStore.getState().updateLayer(layer.id, {
                        locked: !layer.locked,
                      });
                      persistLayers();
                    }}
                  >
                    {layer.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="editor-btn-ghost rounded p-1"
                    title="Delete overlay"
                    style={{ color: "var(--editor-crimson-2)" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      useLayersStore.getState().removeLayer(layer.id);
                      persistLayers();
                      toast.success("Overlay deleted");
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {selected && isGeoImageOverlay(layer) ? (
                  <LayerPoseFields
                    layerId={layer.id}
                    canRaise={canRaise}
                    canLower={canLower}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LayerPoseFields({
  layerId,
  canRaise,
  canLower,
}: {
  layerId: string;
  canRaise: boolean;
  canLower: boolean;
}) {
  const layer = useLayersStore((s) => s.layers.find((item) => item.id === layerId));
  const [open, setOpen] = useState(true);
  if (!layer || !isGeoImageOverlay(layer)) return null;
  const pose = layer.pose;
  const blend = layer.blend ?? 0;

  return (
    <div className={`editor-layer-fields ${open ? "open" : ""}`}>
      <button
        type="button"
        className="editor-layer-fields-head"
        onClick={() => setOpen((value) => !value)}
      >
        Overlay settings
        <ChevronDown className="editor-layer-fields-chevron h-3 w-3" />
      </button>
      {open ? (
        <div className="editor-layer-fields-body">
          <div className="flex gap-2">
            <EditorOrderButton
              label="Forward"
              disabled={!canRaise}
              onClick={() => {
                useLayersStore.getState().moveLayer(layer.id, "forward");
                persistLayers();
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </EditorOrderButton>
            <EditorOrderButton
              label="Backward"
              disabled={!canLower}
              onClick={() => {
                useLayersStore.getState().moveLayer(layer.id, "backward");
                persistLayers();
              }}
            >
              <ChevronDown className="h-3 w-3" />
            </EditorOrderButton>
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            <input
              className="editor-input"
              value={layer.name}
              onChange={(event) => {
                useLayersStore.getState().updateLayer(layer.id, {
                  name: event.target.value,
                });
                persistLayers();
              }}
            />
          </div>
          <div>
            <FieldLabel className="flex justify-between">
              <span>Opacity</span>
              <span>{Math.round(layer.opacity * 100)}%</span>
            </FieldLabel>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layer.opacity}
              onChange={(event) => {
                useLayersStore.getState().updateLayer(layer.id, {
                  opacity: parseFloat(event.target.value),
                });
                persistLayers();
              }}
            />
          </div>
          <div>
            <FieldLabel className="flex items-center justify-between gap-2">
              <span>Blend</span>
              <span className="flex items-center gap-2">
                <span
                  className="editor-layer-blend-preview"
                  style={
                    {
                      "--blend-inner": `${Math.max(0, (1 - blend) * 70)}%`,
                    } as CSSProperties
                  }
                  title="Opacity map: white center, transparent sides"
                />
                <span>{Math.round(blend * 100)}%</span>
              </span>
            </FieldLabel>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={blend}
              onChange={(event) => {
                useLayersStore.getState().updateLayer(layer.id, {
                  blend: parseFloat(event.target.value),
                });
                persistLayers();
              }}
            />
            <p
              className="mt-1 text-[10px] leading-snug"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Feathers the sides of the image into the map.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Longitude</FieldLabel>
              <input
                className="editor-input"
                type="number"
                step="0.0001"
                value={Number(pose.lng.toFixed(5))}
                disabled={layer.locked}
                onChange={(event) => {
                  useLayersStore.getState().updateGeoPose(layer.id, {
                    lng: Number(event.target.value),
                  });
                  persistLayers();
                }}
              />
            </div>
            <div>
              <FieldLabel>Latitude</FieldLabel>
              <input
                className="editor-input"
                type="number"
                step="0.0001"
                value={Number(pose.lat.toFixed(5))}
                disabled={layer.locked}
                onChange={(event) => {
                  useLayersStore.getState().updateGeoPose(layer.id, {
                    lat: Number(event.target.value),
                  });
                  persistLayers();
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Width (m)</FieldLabel>
              <input
                className="editor-input"
                type="number"
                min={10}
                step="1"
                value={Math.round(pose.widthMeters)}
                disabled={layer.locked}
                onChange={(event) => {
                  const widthMeters = Math.max(10, Number(event.target.value));
                  useLayersStore.getState().updateGeoPose(layer.id, { widthMeters });
                  persistLayers();
                }}
              />
            </div>
            <div>
              <FieldLabel>Rotation</FieldLabel>
              <input
                className="editor-input"
                type="number"
                step="1"
                value={Math.round(pose.bearing)}
                disabled={layer.locked}
                onChange={(event) => {
                  useLayersStore.getState().updateGeoPose(layer.id, {
                    bearing: Number(event.target.value),
                  });
                  persistLayers();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditorOrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="editor-btn flex-1 justify-center"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {label}
    </button>
  );
}
