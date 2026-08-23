"use client";

import {
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  EyeOff,
  ImageIcon,
  Lock,
  Plus,
  Square,
  Trash2,
  Triangle,
  Unlock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "sonner";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { defaultOverlayWidthMeters } from "@/lib/editor/geo/overlay-quad";
import {
  OVERLAY_ACCEPT,
  readOverlayImageFile,
} from "@/lib/editor/io/import-overlay-image";
import { selectLayerExclusive } from "@/lib/editor/state/exclusive-selection";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useMapViewportStore } from "@/lib/editor/state/map-viewport-store";
import { syncActiveSceneLayers } from "@/lib/editor/state/scenes-store";
import { markerColorSwatches } from "@/lib/editor/theme/tokens";
import {
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_STROKE,
  DEFAULT_SHAPE_STROKE_WIDTH,
  isGeoImageOverlay,
  isGeoShapeOverlay,
  isImageOverlayLayer,
  isShapeOverlayLayer,
  shapeOverlayLabel,
  SHAPE_OVERLAY_KINDS,
  type SceneLayer,
  type ShapeOverlayKind,
  type ShapeOverlayLayer,
} from "@/lib/editor/types/scene-layer";

function persistLayers() {
  syncActiveSceneLayers();
}

function defaultGeoPose() {
  const viewport = useMapViewportStore.getState();
  const wrap = document.getElementById("editor-viewport-wrap");
  const widthMeters = defaultOverlayWidthMeters(
    viewport.center[1],
    viewport.zoom,
    wrap?.clientWidth ?? 800,
  );
  return {
    space: "geo" as const,
    lng: viewport.center[0],
    lat: viewport.center[1],
    widthMeters,
    bearing: 0,
  };
}

export function LayersPanel() {
  const layers = useLayersStore((s) => s.layers);
  const selectedId = useLayersStore((s) => s.selectedId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagesOpen, setImagesOpen] = useState(true);
  const [shapesOpen, setShapesOpen] = useState(true);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shapeMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!shapeMenuRef.current?.contains(event.target as Node)) {
        setShapeMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [shapeMenuOpen]);

  const imageLayers = layers.filter(isImageOverlayLayer);
  const shapeLayers = layers.filter(isShapeOverlayLayer);
  const imageListed = [...imageLayers].reverse();
  const shapeListed = [...shapeLayers].reverse();

  const addFromFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await readOverlayImageFile(file);
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
        pose: defaultGeoPose(),
      });
      persistLayers();
      setImagesOpen(true);
      toast.success("Overlay added — drag it on the map to position");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add overlay");
    }
  };

  const addShape = (shape: ShapeOverlayKind) => {
    const count =
      useLayersStore.getState().layers.filter(isShapeOverlayLayer).length + 1;
    useLayersStore.getState().addLayer({
      kind: "shape-overlay",
      name: `${shapeOverlayLabel(shape)} ${count}`,
      visible: true,
      locked: false,
      opacity: 1,
      shape,
      fillColor: DEFAULT_SHAPE_FILL,
      strokeColor: DEFAULT_SHAPE_STROKE,
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      pose: defaultGeoPose(),
    });
    persistLayers();
    setShapesOpen(true);
    setShapeMenuOpen(false);
    toast.success("Shape added — drag it on the map to position");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <LayerSection
        title="Image overlays"
        open={imagesOpen}
        onToggle={() => setImagesOpen((value) => !value)}
        action={
          <>
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
          </>
        }
      >
        {imageListed.length === 0 ? (
          <div className="editor-empty-state">
            <ImageIcon
              className="mx-auto mb-2 h-8 w-8"
              style={{ color: "var(--editor-line)" }}
            />
            <div className="mb-1 text-[12px] font-semibold">
              Add a PNG or JPG overlay
            </div>
            <div className="text-[11px]">
              Drop a top-view site photo onto the map, then position it with the
              on-map handles.
            </div>
          </div>
        ) : (
          imageListed.map((layer, visualIndex) => (
            <LayerListItem
              key={layer.id}
              layer={layer}
              selected={layer.id === selectedId}
              zIndex={imageLayers.length - visualIndex}
              canRaise={visualIndex > 0}
              canLower={visualIndex < imageListed.length - 1}
              subtitle="Overlay"
              thumb={
                <span className="editor-layer-thumb">
                  <img src={layer.imageDataUrl} alt="" draggable={false} />
                </span>
              }
            />
          ))
        )}
      </LayerSection>

      <LayerSection
        title="Shape overlays"
        open={shapesOpen}
        onToggle={() => setShapesOpen((value) => !value)}
        action={
          <div className="relative" ref={shapeMenuRef}>
            <IconButton
              title="Add shape"
              onClick={() => setShapeMenuOpen((value) => !value)}
            >
              <Plus className="h-3.5 w-3.5" />
            </IconButton>
            {shapeMenuOpen ? (
              <div className="editor-layer-shape-menu">
                {SHAPE_OVERLAY_KINDS.map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    className="editor-layer-shape-menu-item"
                    onClick={() => addShape(shape)}
                  >
                    <ShapeKindIcon shape={shape} />
                    {shapeOverlayLabel(shape)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        }
      >
        {shapeListed.length === 0 ? (
          <div className="editor-empty-state">
            <Square
              className="mx-auto mb-2 h-8 w-8"
              style={{ color: "var(--editor-line)" }}
            />
            <div className="mb-1 text-[12px] font-semibold">
              Add a simple shape
            </div>
            <div className="text-[11px]">
              Place a square, triangle, or circle on the map, then edit fill and
              stroke in the layer settings.
            </div>
          </div>
        ) : (
          shapeListed.map((layer, visualIndex) => (
            <LayerListItem
              key={layer.id}
              layer={layer}
              selected={layer.id === selectedId}
              zIndex={shapeLayers.length - visualIndex}
              canRaise={visualIndex > 0}
              canLower={visualIndex < shapeListed.length - 1}
              subtitle={shapeOverlayLabel(layer.shape)}
              thumb={
                <span
                  className="editor-layer-thumb editor-layer-shape-thumb"
                  style={{
                    background: layer.fillColor,
                    borderColor: layer.strokeColor,
                  }}
                >
                  <ShapeKindIcon shape={layer.shape} className="h-3.5 w-3.5" />
                </span>
              }
            />
          ))
        )}
      </LayerSection>
    </div>
  );
}

function LayerSection({
  title,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border-b border-[var(--editor-line-soft)] last:border-b-0">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          color: "var(--editor-muted-2)",
          background: "rgba(11,20,36,0.4)",
        }}
      >
        <button
          type="button"
          className="editor-layer-section-toggle"
          onClick={onToggle}
          aria-expanded={open}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {title}
          </span>
        </button>
        {action}
      </div>
      {open ? (
        <div className="space-y-1.5 px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

function LayerListItem({
  layer,
  selected,
  zIndex,
  canRaise,
  canLower,
  subtitle,
  thumb,
}: {
  layer: SceneLayer;
  selected: boolean;
  zIndex: number;
  canRaise: boolean;
  canLower: boolean;
  subtitle: string;
  thumb: ReactNode;
}) {
  return (
    <div>
      <div
        className={`editor-hot-item ${selected ? "selected" : ""}`}
        onClick={() => selectLayerExclusive(layer.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter") selectLayerExclusive(layer.id);
        }}
        role="button"
        tabIndex={0}
      >
        {thumb}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold">{layer.name}</div>
          <div
            className="text-[10.5px] uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            {subtitle} · z{zIndex}
          </div>
        </div>
        <button
          type="button"
          className="editor-btn-ghost rounded p-1"
          title={layer.visible ? "Hide layer" : "Show layer"}
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
          title={layer.locked ? "Unlock layer" : "Lock layer"}
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
          title="Delete layer"
          style={{ color: "var(--editor-crimson-2)" }}
          onClick={(event) => {
            event.stopPropagation();
            useLayersStore.getState().removeLayer(layer.id);
            persistLayers();
            toast.success("Layer deleted");
          }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {selected && isGeoImageOverlay(layer) ? (
        <ImageLayerFields
          layerId={layer.id}
          canRaise={canRaise}
          canLower={canLower}
        />
      ) : null}
      {selected && isGeoShapeOverlay(layer) ? (
        <ShapeLayerFields
          layerId={layer.id}
          canRaise={canRaise}
          canLower={canLower}
        />
      ) : null}
    </div>
  );
}

function ImageLayerFields({
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
          <OrderButtons
            canRaise={canRaise}
            canLower={canLower}
            layerId={layer.id}
          />
          <NameField layerId={layer.id} value={layer.name} />
          <OpacityField layerId={layer.id} value={layer.opacity} />
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
          <GeoPoseFields layerId={layer.id} locked={layer.locked} pose={pose} />
        </div>
      ) : null}
    </div>
  );
}

function ShapeLayerFields({
  layerId,
  canRaise,
  canLower,
}: {
  layerId: string;
  canRaise: boolean;
  canLower: boolean;
}) {
  const layer = useLayersStore((s) =>
    s.layers.find((item) => item.id === layerId),
  ) as ShapeOverlayLayer | undefined;
  const [open, setOpen] = useState(true);
  if (!layer || !isGeoShapeOverlay(layer)) return null;
  const pose = layer.pose;
  const isCustomFill = !markerColorSwatches.includes(
    layer.fillColor as (typeof markerColorSwatches)[number],
  );
  const isCustomStroke = !markerColorSwatches.includes(
    layer.strokeColor as (typeof markerColorSwatches)[number],
  );

  return (
    <div className={`editor-layer-fields ${open ? "open" : ""}`}>
      <button
        type="button"
        className="editor-layer-fields-head"
        onClick={() => setOpen((value) => !value)}
      >
        Shape settings
        <ChevronDown className="editor-layer-fields-chevron h-3 w-3" />
      </button>
      {open ? (
        <div className="editor-layer-fields-body">
          <OrderButtons
            canRaise={canRaise}
            canLower={canLower}
            layerId={layer.id}
          />
          <NameField layerId={layer.id} value={layer.name} />
          <div>
            <FieldLabel>Shape</FieldLabel>
            <div className="editor-pill-row">
              {SHAPE_OVERLAY_KINDS.map((shape) => (
                <TypePill
                  key={shape}
                  active={layer.shape === shape}
                  onClick={() => {
                    useLayersStore.getState().updateLayer(layer.id, { shape });
                    persistLayers();
                  }}
                >
                  {shape}
                </TypePill>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Fill</FieldLabel>
            <LayerColorRow
              value={layer.fillColor}
              isCustom={isCustomFill}
              onChange={(fillColor) => {
                useLayersStore.getState().updateLayer(layer.id, { fillColor });
                persistLayers();
              }}
            />
          </div>
          <div>
            <FieldLabel>Stroke</FieldLabel>
            <LayerColorRow
              value={layer.strokeColor}
              isCustom={isCustomStroke}
              onChange={(strokeColor) => {
                useLayersStore.getState().updateLayer(layer.id, { strokeColor });
                persistLayers();
              }}
            />
          </div>
          <div>
            <FieldLabel className="flex justify-between">
              <span>Stroke width</span>
              <span>{layer.strokeWidth}px</span>
            </FieldLabel>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={layer.strokeWidth}
              onChange={(event) => {
                useLayersStore.getState().updateLayer(layer.id, {
                  strokeWidth: Number(event.target.value),
                });
                persistLayers();
              }}
            />
          </div>
          <OpacityField layerId={layer.id} value={layer.opacity} />
          <GeoPoseFields layerId={layer.id} locked={layer.locked} pose={pose} />
        </div>
      ) : null}
    </div>
  );
}

function LayerColorRow({
  value,
  isCustom,
  onChange,
}: {
  value: string;
  isCustom: boolean;
  onChange: (color: string) => void;
}) {
  return (
    <div className="editor-swatch-row">
      {markerColorSwatches.map((color) => (
        <ColorSwatch
          key={color}
          color={color}
          selected={value === color}
          onClick={() => onChange(color)}
        />
      ))}
      <label
        className={`editor-swatch editor-swatch-custom ${isCustom ? "selected" : ""}`}
        title="Custom color"
        style={isCustom ? { background: value } : undefined}
      >
        <input
          type="color"
          aria-label="Custom color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#3fb8af"}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function OrderButtons({
  layerId,
  canRaise,
  canLower,
}: {
  layerId: string;
  canRaise: boolean;
  canLower: boolean;
}) {
  return (
    <div className="flex gap-2">
      <EditorOrderButton
        label="Forward"
        disabled={!canRaise}
        onClick={() => {
          useLayersStore.getState().moveLayer(layerId, "forward");
          persistLayers();
        }}
      >
        <ChevronUp className="h-3 w-3" />
      </EditorOrderButton>
      <EditorOrderButton
        label="Backward"
        disabled={!canLower}
        onClick={() => {
          useLayersStore.getState().moveLayer(layerId, "backward");
          persistLayers();
        }}
      >
        <ChevronDown className="h-3 w-3" />
      </EditorOrderButton>
    </div>
  );
}

function NameField({ layerId, value }: { layerId: string; value: string }) {
  return (
    <div>
      <FieldLabel>Name</FieldLabel>
      <input
        className="editor-input"
        value={value}
        onChange={(event) => {
          useLayersStore.getState().updateLayer(layerId, {
            name: event.target.value,
          });
          persistLayers();
        }}
      />
    </div>
  );
}

function OpacityField({ layerId, value }: { layerId: string; value: number }) {
  return (
    <div>
      <FieldLabel className="flex justify-between">
        <span>Opacity</span>
        <span>{Math.round(value * 100)}%</span>
      </FieldLabel>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => {
          useLayersStore.getState().updateLayer(layerId, {
            opacity: parseFloat(event.target.value),
          });
          persistLayers();
        }}
      />
    </div>
  );
}

function GeoPoseFields({
  layerId,
  locked,
  pose,
}: {
  layerId: string;
  locked: boolean;
  pose: { lng: number; lat: number; widthMeters: number; bearing: number };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Longitude</FieldLabel>
          <input
            className="editor-input"
            type="number"
            step="0.0001"
            value={Number(pose.lng.toFixed(5))}
            disabled={locked}
            onChange={(event) => {
              useLayersStore.getState().updateGeoPose(layerId, {
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
            disabled={locked}
            onChange={(event) => {
              useLayersStore.getState().updateGeoPose(layerId, {
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
            disabled={locked}
            onChange={(event) => {
              const widthMeters = Math.max(10, Number(event.target.value));
              useLayersStore.getState().updateGeoPose(layerId, { widthMeters });
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
            disabled={locked}
            onChange={(event) => {
              useLayersStore.getState().updateGeoPose(layerId, {
                bearing: Number(event.target.value),
              });
              persistLayers();
            }}
          />
        </div>
      </div>
    </>
  );
}

function ShapeKindIcon({
  shape,
  className = "h-3.5 w-3.5",
}: {
  shape: ShapeOverlayKind;
  className?: string;
}) {
  if (shape === "triangle") return <Triangle className={className} />;
  if (shape === "circle") return <Circle className={className} />;
  return <Square className={className} />;
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
