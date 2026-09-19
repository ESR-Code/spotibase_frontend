"use client";

import {
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  EyeOff,
  ImageIcon,
  Lock,
  PenLine,
  Plus,
  Square,
  Trash2,
  Triangle,
  Unlock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "@/lib/editor/toast";
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
import { useShapeDrawStore } from "@/lib/editor/state/shape-draw-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
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
  SHAPE_PRIMITIVE_KINDS,
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
  const selectionTick = useLayersStore((s) => s.selectionTick);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagesOpen, setImagesOpen] = useState(true);
  const [shapesOpen, setShapesOpen] = useState(true);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const drawing = useShapeDrawStore((s) => s.drawing);

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

  useEffect(() => {
    if (!selectedId) return;
    setExpandedIds((prev) => ({ ...prev, [selectedId]: true }));
    const layer = useLayersStore
      .getState()
      .layers.find((item) => item.id === selectedId);
    if (layer?.kind === "image-overlay") setImagesOpen(true);
    if (layer?.kind === "shape-overlay") setShapesOpen(true);
  }, [selectedId, selectionTick]);

  const imageLayers = layers.filter(isImageOverlayLayer);
  const shapeLayers = layers.filter(isShapeOverlayLayer);
  const imageListed = [...imageLayers].reverse();
  const shapeListed = [...shapeLayers].reverse();

  const toggleExpanded = (id: string) => {
    const alreadySelected = useLayersStore.getState().selectedId === id;
    const currentlyExpanded = !!expandedIds[id];
    if (alreadySelected && currentlyExpanded) {
      setExpandedIds((prev) => ({ ...prev, [id]: false }));
      return;
    }
    selectLayerExclusive(id);
    // New / re-selection expands via selectionTick effect.
  };

  const addFromFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await readOverlayImageFile(file);
      const layer = useLayersStore.getState().addLayer({
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
      setExpandedIds((prev) => ({ ...prev, [layer.id]: true }));
      toast.success("Overlay added — drag it on the map to position");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add overlay");
    }
  };

  const addShape = (shape: ShapeOverlayKind) => {
    setShapeMenuOpen(false);
    if (shape === "free") {
      useShapeDrawStore.getState().begin();
      useUIStore.getState().setOutlinerCollapsed(false);
      useUIStore.getState().setOutlinerTab("layers");
      toast.message("Click the map to place points", {
        description: "Click the first point or press Enter to close. Esc cancels.",
      });
      return;
    }
    const count =
      useLayersStore.getState().layers.filter(isShapeOverlayLayer).length + 1;
    const layer = useLayersStore.getState().addLayer({
      kind: "shape-overlay",
      name: `${shapeOverlayLabel(shape)} ${count}`,
      visible: true,
      locked: false,
      opacity: 1,
      shape,
      fillColor: DEFAULT_SHAPE_FILL,
      strokeColor: DEFAULT_SHAPE_STROKE,
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      ring: null,
      pose: defaultGeoPose(),
    });
    persistLayers();
    setShapesOpen(true);
    setExpandedIds((prev) => ({ ...prev, [layer.id]: true }));
    toast.success("Shape added — drag it on the map to position");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {drawing ? (
        <div className="editor-layer-draw-banner">
          <span>Drawing free shape…</span>
          <button
            type="button"
            className="editor-btn-ghost text-[11px] font-semibold"
            onClick={() => {
              useShapeDrawStore.getState().cancel();
              toast.message("Free shape drawing cancelled");
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <LayerSection
        title="Image overlays"
        count={imageLayers.length}
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
            <LayerAccordionItem
              key={layer.id}
              layer={layer}
              selected={layer.id === selectedId}
              expanded={!!expandedIds[layer.id]}
              onToggleExpand={() => toggleExpanded(layer.id)}
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
        count={shapeLayers.length}
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
              Place a square, triangle, circle, or freehand shape on the map.
            </div>
          </div>
        ) : (
          shapeListed.map((layer, visualIndex) => (
            <LayerAccordionItem
              key={layer.id}
              layer={layer}
              selected={layer.id === selectedId}
              expanded={!!expandedIds[layer.id]}
              onToggleExpand={() => toggleExpanded(layer.id)}
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
  count,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  count: number;
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
          <span className="editor-layer-section-count">{count}</span>
        </button>
        {action}
      </div>
      {open ? (
        <div className="space-y-1.5 px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

function LayerAccordionItem({
  layer,
  selected,
  expanded,
  onToggleExpand,
  zIndex,
  canRaise,
  canLower,
  subtitle,
  thumb,
}: {
  layer: SceneLayer;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  zIndex: number;
  canRaise: boolean;
  canLower: boolean;
  subtitle: string;
  thumb: ReactNode;
}) {
  return (
    <div
      className={`editor-layer-card ${selected ? "selected" : ""} ${expanded ? "expanded" : ""}`}
    >
      <div
        className="editor-layer-card-head"
        onClick={onToggleExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleExpand();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <ChevronDown
          className={`editor-layer-card-chevron h-3.5 w-3.5 ${expanded ? "open" : ""}`}
        />
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

      {expanded ? (
        <div className="editor-layer-card-body">
          {isGeoImageOverlay(layer) ? (
            <ImageLayerFields
              layerId={layer.id}
              canRaise={canRaise}
              canLower={canLower}
            />
          ) : null}
          {isGeoShapeOverlay(layer) ? (
            <ShapeLayerFields
              layerId={layer.id}
              canRaise={canRaise}
              canLower={canLower}
            />
          ) : null}
        </div>
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
  if (!layer || !isGeoImageOverlay(layer)) return null;
  const pose = layer.pose;
  const blend = layer.blend ?? 0;

  return (
    <>
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
    </>
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
  if (!layer || !isGeoShapeOverlay(layer)) return null;
  const pose = layer.pose;
  const isCustomFill = !markerColorSwatches.includes(
    layer.fillColor as (typeof markerColorSwatches)[number],
  );
  const isCustomStroke = !markerColorSwatches.includes(
    layer.strokeColor as (typeof markerColorSwatches)[number],
  );
  const isFree = layer.shape === "free";

  return (
    <>
      <OrderButtons
        canRaise={canRaise}
        canLower={canLower}
        layerId={layer.id}
      />
      <NameField layerId={layer.id} value={layer.name} />
      {isFree ? (
        <p
          className="text-[11px] leading-snug"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Freehand polygon. Move, scale, and rotate with the on-map handles.
        </p>
      ) : (
        <div>
          <FieldLabel>Shape</FieldLabel>
          <div className="editor-pill-row">
            {SHAPE_PRIMITIVE_KINDS.map((shape) => (
              <TypePill
                key={shape}
                active={layer.shape === shape}
                onClick={() => {
                  useLayersStore.getState().updateLayer(layer.id, {
                    shape,
                    ring: null,
                  });
                  persistLayers();
                }}
              >
                {shape}
              </TypePill>
            ))}
          </div>
        </div>
      )}
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
    </>
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
  const [open, setOpen] = useState(false);

  return (
    <div className={`editor-layer-subfields ${open ? "open" : ""}`}>
      <button
        type="button"
        className="editor-layer-subfields-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>Position</span>
        <ChevronDown className="editor-layer-subfields-chevron h-3 w-3" />
      </button>
      {open ? (
        <div className="editor-layer-subfields-body">
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
                  useLayersStore.getState().updateGeoPose(layerId, {
                    widthMeters,
                  });
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
        </div>
      ) : null}
    </div>
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
  if (shape === "free") return <PenLine className={className} />;
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
