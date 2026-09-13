"use client";

import { interpolatePlainText } from "@/lib/editor/actions/interpolate-fields";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useHttpResponseStore } from "@/lib/editor/state/http-response-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

/** Re-render when HTTP samples or Preview cache change so `{{tokens}}` update. */
export function useLiveFieldInterpolation(): void {
  useEditorStore((s) => s.hotspots);
  useScenesStore((s) => s.appStartActions);
  useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.legendActions ?? null;
  });
  useHttpResponseStore((s) => s.byKey);
}

export function useInterpolatedPlainText(template: string): string {
  useLiveFieldInterpolation();
  return interpolatePlainText(template);
}
