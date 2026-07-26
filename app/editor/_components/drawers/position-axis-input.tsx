"use client";

import { useEffect, useRef } from "react";

const FINE_STEP = 0.01;
const COARSE_STEP = 0.1;

type PositionAxisInputProps = {
  value: number;
  onChange: (value: number) => void;
  "aria-label"?: string;
};

export function PositionAxisInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: PositionAxisInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const step = event.shiftKey ? COARSE_STEP : FINE_STEP;
      const direction = event.deltaY < 0 ? 1 : -1;
      const next = +(valueRef.current + direction * step).toFixed(3);
      valueRef.current = next;
      onChangeRef.current(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <input
      ref={inputRef}
      type="number"
      step={FINE_STEP}
      className="editor-input"
      aria-label={ariaLabel}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const next = parseFloat(e.target.value);
        if (Number.isNaN(next)) return;
        onChange(+next.toFixed(3));
      }}
    />
  );
}
