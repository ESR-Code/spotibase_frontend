"use client";

import {
  GEO_MAP_STYLES,
  resolveGeoMapStyle,
  type GeoMapStyleId,
} from "@/lib/editor/geo/map-styles";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { syncActiveSceneGeo } from "@/lib/editor/state/scenes-store";

export function MapStyleSection() {
  const mapStyleId = useGeoStore((s) => s.mapStyleId);
  const selected = resolveGeoMapStyle(mapStyleId);

  const selectStyle = (id: GeoMapStyleId) => {
    useGeoStore.getState().setGeo({ mapStyleId: id });
    syncActiveSceneGeo();
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
        Color templates for this scene&apos;s globe. Changes apply instantly.
      </p>
      <div className="editor-map-style-grid">
        {GEO_MAP_STYLES.map((style) => {
          const active = style.id === selected.id;
          return (
            <button
              key={style.id}
              type="button"
              className={`editor-map-style-card${active ? " active" : ""}`}
              aria-pressed={active}
              onClick={() => selectStyle(style.id)}
            >
              <span className="editor-map-style-preview">
                <img
                  src={style.previewSrc}
                  alt=""
                  draggable={false}
                />
              </span>
              <span className="editor-map-style-meta">
                <span className="editor-map-style-name">{style.label}</span>
                <span className="editor-map-style-swatches" aria-hidden>
                  {style.swatches.map((color) => (
                    <span
                      key={color}
                      className="editor-map-style-swatch"
                      style={{ background: color }}
                    />
                  ))}
                </span>
              </span>
              <span className="editor-map-style-desc">{style.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
