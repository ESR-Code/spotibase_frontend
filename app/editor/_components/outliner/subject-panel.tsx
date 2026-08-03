"use client";

import { Box, RotateCcw } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import {
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
  useModelStore,
} from "@/lib/editor/state/model-store";

export function SubjectPanel() {
  const modelName = useModelStore((s) => s.modelName);
  const modelInfo = useModelStore((s) => s.modelInfo);
  const hasUserModel = useModelStore((s) => s.hasUserModel);
  const modelScale = useModelStore((s) => s.modelScale);
  const modelRotation = useModelStore((s) => s.modelRotation);
  const setModelScale = useModelStore((s) => s.setModelScale);
  const setModelRotation = useModelStore((s) => s.setModelRotation);
  const resetModelTransform = useModelStore((s) => s.resetModelTransform);

  const isDefaultTransform =
    modelScale === DEFAULT_MODEL_SCALE &&
    modelRotation.x === DEFAULT_MODEL_ROTATION.x &&
    modelRotation.y === DEFAULT_MODEL_ROTATION.y &&
    modelRotation.z === DEFAULT_MODEL_ROTATION.z;

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
          <Box className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold">{modelName}</div>
          <div className="text-[10px]" style={{ color: "var(--editor-muted-2)" }}>
            {hasUserModel ? modelInfo : "Sample subject — import a .glb to replace"}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <div
            className="mb-2.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Size
          </div>
          <SliderField
            label="Uniform Scale"
            value={modelScale}
            display={`${modelScale.toFixed(2)}×`}
            min={0.1}
            max={3}
            step={0.05}
            onChange={setModelScale}
          />
        </section>

        <section>
          <div
            className="mb-2.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Rotation
          </div>
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
        </section>

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
      </div>
    </div>
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
      />
    </div>
  );
}
