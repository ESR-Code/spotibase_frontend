"use client";

import "@/lib/editor/geo/init-maplibre";
import { useEffect, useMemo, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/components/ui/map";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import {
  DEFAULT_GEO_GLOBE_ZOOM,
  DEFAULT_GEO_PIN_ZOOM,
} from "@/lib/editor/constants/default-settings";
import { geoMapStyleUrls } from "@/lib/editor/geo/map-styles";
import { searchNominatimPlaces, type NominatimHit } from "@/lib/editor/geo/nominatim";
import { resolveGeoHomeViewport } from "@/lib/editor/geo/resolve-home-viewport";
import { useGeoForm } from "@/lib/editor/forms/use-geo-form";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useMapViewportStore } from "@/lib/editor/state/map-viewport-store";
import { syncActiveSceneGeo } from "@/lib/editor/state/scenes-store";

function applyStart(lng: number, lat: number, zoom: number) {
  useGeoStore.getState().setGeo({
    start: { lng, lat },
    startZoom: zoom,
  });
  syncActiveSceneGeo();
}

function GeoPickerClickBridge({
  onPick,
  viewport,
}: {
  onPick: (lng: number, lat: number) => void;
  viewport: { center: [number, number]; zoom: number; bearing: number; pitch: number };
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const onClick = (event: { lngLat: { lng: number; lat: number } }) => {
      onPick(event.lngLat.lng, event.lngLat.lat);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, isLoaded, onPick]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    map.jumpTo({
      center: viewport.center,
      zoom: viewport.zoom,
      bearing: viewport.bearing,
      pitch: viewport.pitch,
    });
  }, [
    map,
    isLoaded,
    viewport.center[0],
    viewport.center[1],
    viewport.zoom,
    viewport.bearing,
    viewport.pitch,
  ]);

  return null;
}

export function GeoDetailsSection() {
  const { form } = useGeoForm();
  const values = form.watch();
  const mapStyleId = useGeoStore((s) => s.mapStyleId);
  const mapStyles = useMemo(() => geoMapStyleUrls(mapStyleId), [mapStyleId]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasStart = values.startLng != null && values.startLat != null;
  const pickerViewport = resolveGeoHomeViewport(null, {
    start: hasStart
      ? { lng: values.startLng as number, lat: values.startLat as number }
      : null,
    startZoom: values.startZoom,
  });

  useEffect(() => {
    abortRef.current?.abort();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchNominatimPlaces(trimmed, controller.signal)
        .then((results) => {
          setHits(results);
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setHits([]);
          setSearchError(
            error instanceof Error ? error.message : "Place search failed",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const commitStart = (lng: number, lat: number, zoom = values.startZoom) => {
    const nextZoom =
      !hasStart && zoom <= DEFAULT_GEO_GLOBE_ZOOM + 0.2
        ? DEFAULT_GEO_PIN_ZOOM
        : zoom;
    form.setValue("startLng", Number(lng.toFixed(6)));
    form.setValue("startLat", Number(lat.toFixed(6)));
    form.setValue("startZoom", nextZoom);
    applyStart(lng, lat, nextZoom);
  };

  const clearStart = () => {
    form.setValue("startLng", null);
    form.setValue("startLat", null);
    form.setValue("startZoom", DEFAULT_GEO_GLOBE_ZOOM);
    useGeoStore.getState().setGeo({
      start: null,
      startZoom: DEFAULT_GEO_GLOBE_ZOOM,
    });
    syncActiveSceneGeo();
    setQuery("");
    setHits([]);
  };

  const useCurrentViewport = () => {
    const live = useMapViewportStore.getState();
    commitStart(live.center[0], live.center[1], live.zoom);
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
        Default view is a globe. Set a start pin to open this scene on those
        coordinates.
      </p>

      <div>
        <FieldLabel>Place search</FieldLabel>
        <input
          className="editor-input"
          placeholder="Search a city, park, or address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching ? (
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Searching…
          </p>
        ) : null}
        {searchError ? (
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-crimson)" }}>
            {searchError}
          </p>
        ) : null}
        {hits.length > 0 ? (
          <div className="editor-geo-search-list mt-1.5">
            {hits.map((hit) => (
              <button
                key={`${hit.lng}-${hit.lat}-${hit.displayName}`}
                type="button"
                className="editor-geo-search-item"
                onClick={() => {
                  commitStart(hit.lng, hit.lat, DEFAULT_GEO_PIN_ZOOM);
                  setQuery(hit.displayName);
                  setHits([]);
                }}
              >
                {hit.displayName}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="editor-geo-picker">
        <Map
          theme="dark"
          styles={mapStyles}
          projection={{ type: "globe" }}
          viewport={pickerViewport}
          attributionControl={false}
        >
          <GeoPickerClickBridge
            viewport={pickerViewport}
            onPick={(lng, lat) => commitStart(lng, lat, values.startZoom)}
          />
          {hasStart ? (
            <MapMarker
              longitude={values.startLng as number}
              latitude={values.startLat as number}
            >
              <MarkerContent>
                <div className="editor-geo-marker" style={{ "--geo-marker-color": "var(--editor-teal)" } as React.CSSProperties}>
                  <span className="editor-geo-marker-stick" />
                  <span className="editor-geo-marker-core" />
                </div>
              </MarkerContent>
            </MapMarker>
          ) : null}
        </Map>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Longitude</FieldLabel>
          <input
            className="editor-input"
            type="number"
            step="0.0001"
            min={-180}
            max={180}
            value={values.startLng ?? ""}
            placeholder="—"
            onChange={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              form.setValue("startLng", value);
              if (value != null && values.startLat != null) {
                applyStart(value, values.startLat, values.startZoom);
              }
            }}
          />
        </div>
        <div>
          <FieldLabel>Latitude</FieldLabel>
          <input
            className="editor-input"
            type="number"
            step="0.0001"
            min={-90}
            max={90}
            value={values.startLat ?? ""}
            placeholder="—"
            onChange={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              form.setValue("startLat", value);
              if (value != null && values.startLng != null) {
                applyStart(values.startLng, value, values.startZoom);
              }
            }}
          />
        </div>
      </div>

      <div>
        <FieldLabel className="flex justify-between">
          <span>Start zoom</span>
          <span>{values.startZoom.toFixed(1)}</span>
        </FieldLabel>
        <input
          type="range"
          min={0}
          max={22}
          step={0.1}
          value={values.startZoom}
          onChange={(e) => {
            const zoom = parseFloat(e.target.value);
            form.setValue("startZoom", zoom);
            if (hasStart) {
              applyStart(values.startLng as number, values.startLat as number, zoom);
            } else {
              useGeoStore.getState().setGeo({ startZoom: zoom });
              syncActiveSceneGeo();
            }
          }}
        />
      </div>

      <div className="flex gap-2">
        <EditorButton type="button" className="flex-1" onClick={useCurrentViewport}>
          Use current viewport
        </EditorButton>
        <EditorButton type="button" variant="ghost" onClick={clearStart}>
          Clear
        </EditorButton>
      </div>
    </div>
  );
}
