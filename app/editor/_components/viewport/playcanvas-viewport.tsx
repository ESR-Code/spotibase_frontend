"use client";

import { usePlayCanvasEditor } from "@/lib/editor/hooks/use-playcanvas-editor";

export function PlayCanvasViewport() {
  const { canvasRef } = usePlayCanvasEditor();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
