import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { toast } from "sonner";

const FADE_MS = 420;
const HOLD_MS = 380;

let transitionToken = 0;

/**
 * Fade to a splash showing the target scene name, switch scenes while
 * covered, then fade out. Returns `"stop"` so later action nodes do not
 * run against a disappearing hotspot/scene.
 */
export function transitionToScene(sceneId: string): "stop" {
  const scenesState = useScenesStore.getState();
  const scene = scenesState.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    toast.error("Go To Scene: target scene no longer exists");
    return "stop";
  }

  if (scenesState.activeSceneId === sceneId) {
    return "stop";
  }

  const token = ++transitionToken;
  const ui = useUIStore.getState();
  ui.startSceneTransition(scene.name);

  window.setTimeout(() => {
    if (token !== transitionToken) return;

    const latestUi = useUIStore.getState();
    latestUi.setPreviewModalOpen(false);
    latestUi.setPreviewActiveHotspotId(null);
    latestUi.setPreviewLabelPending(false);
    latestUi.setHoverTooltip(null);
    latestUi.setInfoBoxAnchor(null);
    latestUi.setLegendDrawerOpen(false);
    latestUi.setSceneExplorerDrawerOpen(false);

    useScenesStore.getState().switchScene(sceneId);
    latestUi.holdSceneTransition();

    window.setTimeout(() => {
      if (token !== transitionToken) return;
      useUIStore.getState().beginSceneTransitionOut();

      window.setTimeout(() => {
        if (token !== transitionToken) return;
        useUIStore.getState().endSceneTransition();
      }, FADE_MS);
    }, HOLD_MS);
  }, FADE_MS);

  return "stop";
}
