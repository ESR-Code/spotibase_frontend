"use client";

import {
  Box,
  Globe,
  ImageIcon,
  MapPinned,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { CoordinateInspector } from "@/app/editor/_components/viewport/coordinate-inspector";
import { openGeoreferenceWorkflow } from "@/app/editor/_components/drawers/georeference-section";
import { importSubjectFile } from "@/lib/editor/io/import-subject";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import {
  DEFAULT_MODEL_REFLECTION,
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
  useModelStore,
} from "@/lib/editor/state/model-store";
import { useActiveScene, useScenesStore } from "@/lib/editor/state/scenes-store";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";

export function SubjectPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scene = useActiveScene();
  const descriptor = getSceneType(scene.type);
  const controls = descriptor.subjectControls;

  const modelName = useModelStore((s) => s.modelName);
  const modelInfo = useModelStore((s) => s.modelInfo);
  const hasUserModel = useModelStore((s) => s.hasUserModel);
  const modelScale = useModelStore((s) => s.modelScale);
  const modelRotation = useModelStore((s) => s.modelRotation);
  const modelReflection = useModelStore((s) => s.modelReflection);
  const setModelScale = useModelStore((s) => s.setModelScale);
  const setModelRotation = useModelStore((s) => s.setModelRotation);
  const setModelReflection = useModelStore((s) => s.setModelReflection);
  const resetModelTransform = useModelStore((s) => s.resetModelTransform);

  const isDefaultTransform =
    modelScale === DEFAULT_MODEL_SCALE &&
    modelRotation.x === DEFAULT_MODEL_ROTATION.x &&
    modelRotation.y === DEFAULT_MODEL_ROTATION.y &&
    modelRotation.z === DEFAULT_MODEL_ROTATION.z;

  const openFilePicker = () => fileInputRef.current?.click();
  const SubjectIcon =
    scene.type === "image" ? ImageIcon : scene.type === "geo" ? Globe : Box;
  const geoStart = useGeoStore((s) => s.start);
  const geoZoom = useGeoStore((s) => s.startZoom);

  if (descriptor.engine === "map") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "rgba(244, 162, 89, 0.12)",
              border: "1px solid rgba(244, 162, 89, 0.35)",
              color: "var(--editor-amber)",
            }}
          >
            <Globe className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold">
              {descriptor.emptySubjectName}
            </div>
            <div className="text-[10px]" style={{ color: "var(--editor-muted-2)" }}>
              {geoStart
                ? `${geoStart.lat.toFixed(4)}, ${geoStart.lng.toFixed(4)} · z${geoZoom.toFixed(1)}`
                : "World globe — no start pin"}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <p className="text-[12px] leading-snug" style={{ color: "var(--editor-muted)" }}>
            This scene uses a geo map instead of a 3D model. Set the opening
            coordinates in Geo details.
          </p>
          <EditorButton
            type="button"
            className="w-full justify-center text-[12.5px]"
            onClick={() => {
              useUIStore.getState().setGeneralSettingsDrawerOpen(false);
              useUIStore.getState().setSettingsDrawerOpen(true);
            }}
          >
            <Globe className="h-4 w-4" />
            Edit in Geo details
          </EditorButton>
        </div>
      </div>
    );
  }

  const emptyHint =
    scene.type === "image"
      ? "Import a PNG, JPG, or WebP"
      : "Sample subject — import a .glb to replace";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept={descriptor.accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importSubjectFile(file);
          e.target.value = "";
        }}
      />

      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "rgba(244, 162, 89, 0.12)",
            border: "1px solid rgba(244, 162, 89, 0.35)",
            color: "var(--editor-amber)",
          }}
        >
          <SubjectIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold">{modelName}</div>
          <div className="text-[10px]" style={{ color: "var(--editor-muted-2)" }}>
            {hasUserModel ? modelInfo : emptyHint}
          </div>
        </div>
        {hasUserModel ? (
          <button
            type="button"
            title="Replace subject"
            aria-label="Replace subject"
            onClick={openFilePicker}
            className="editor-replace-model-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.25} />
            Replace
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {!hasUserModel ? (
          <EditorButton
            type="button"
            className="w-full justify-center text-[12.5px]"
            title={
              scene.type === "image"
                ? "Import a 2D image"
                : "Import a .glb model"
            }
            onClick={openFilePicker}
          >
            <Upload className="h-4 w-4" />
            {scene.type === "image" ? "Import Image" : "Import Model"}
          </EditorButton>
        ) : null}

        {controls.scale || controls.rotation || controls.reflection ? (
          <SettingsSection
            title="Subject properties"
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            defaultOpen
          >
            {controls.scale ? (
              <SliderField
                label="Uniform Scale"
                value={modelScale}
                display={`${modelScale.toFixed(2)}×`}
                min={0.1}
                max={3}
                step={0.05}
                onChange={setModelScale}
              />
            ) : null}

            {controls.rotation ? (
              <div className="space-y-3">
                <SliderField
                  label="Rotate X"
                  value={modelRotation.x}
                  display={`${Math.round(modelRotation.x)}°`}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(v) => setModelRotation("x", v)}
                />
                <SliderField
                  label="Rotate Y"
                  value={modelRotation.y}
                  display={`${Math.round(modelRotation.y)}°`}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(v) => setModelRotation("y", v)}
                />
                <SliderField
                  label="Rotate Z"
                  value={modelRotation.z}
                  display={`${Math.round(modelRotation.z)}°`}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(v) => setModelRotation("z", v)}
                />
              </div>
            ) : null}

            {controls.reflection ? (
              <div>
                <SliderField
                  label="Reflection"
                  value={modelReflection}
                  display={`${Math.round(modelReflection * 100)}%`}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={setModelReflection}
                />
                {modelReflection !== DEFAULT_MODEL_REFLECTION ? (
                  <p
                    className="mt-1.5 text-[10px] leading-snug"
                    style={{ color: "var(--editor-muted-2)" }}
                  >
                    Lower values reduce gloss so model shadows read more clearly.
                  </p>
                ) : null}
              </div>
            ) : null}

            {controls.scale || controls.rotation ? (
              <EditorButton
                type="button"
                variant="ghost"
                className="w-full justify-center text-[12px]"
                disabled={isDefaultTransform}
                title="Reset size and rotation"
                onClick={resetModelTransform}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Transform
              </EditorButton>
            ) : null}
          </SettingsSection>
        ) : null}

        <GeoreferenceSubjectButton />
      </div>
    </div>
  );
}

function GeoreferenceSubjectButton() {
  const scene = useActiveScene();
  const geoCount = useScenesStore(
    (s) => s.scenes.filter((item) => item.type === "geo").length,
  );
  const aligned = isAlignedGeoReference(scene.geoReference);
  const disabled = geoCount === 0;

  return (
    <>
      <SettingsSection
        title="Georeference"
        icon={<MapPinned className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <EditorButton
          type="button"
          className="w-full justify-center text-[12.5px]"
          disabled={disabled}
          title={
            disabled
              ? "A Geo Map scene is required before this scene can be georeferenced"
              : "Align this scene to a Geo Map"
          }
          onClick={() => openGeoreferenceWorkflow(scene.id)}
        >
          <MapPinned className="h-4 w-4" />
          Georeference Scene
        </EditorButton>
        {disabled ? (
          <p
            className="text-[11px] leading-snug"
            style={{ color: "var(--editor-muted)" }}
          >
            Add a Geo Map scene first.
          </p>
        ) : aligned ? (
          <p
            className="text-[11px] leading-snug"
            style={{ color: "var(--editor-teal)" }}
          >
            Aligned to a Geo Map — click to edit control points.
          </p>
        ) : null}
      </SettingsSection>
      <CoordinateInspector />
    </>
  );
}

function SliderField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const updateFromPointer = (event: ReactPointerEvent<HTMLInputElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    const raw = min + ratio * (max - min);
    const stepped = Math.round((raw - min) / step) * step + min;
    onChange(Math.min(max, Math.max(min, Number(stepped.toFixed(6)))));
  };

  return (
    <div>
      <FieldLabel className="flex justify-between">
        <span>{label}</span>
        <span>{display}</span>
      </FieldLabel>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateFromPointer(event);
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      />
    </div>
  );
}
