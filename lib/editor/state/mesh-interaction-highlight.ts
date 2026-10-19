import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  usePreviewMeshHighlightStore,
  type MeshHighlightById,
  type MeshHighlightStyle,
} from "@/lib/editor/state/preview-mesh-highlight-store";
import { findHotspot } from "@/lib/editor/state/preview-hotspots";
import { useUIStore } from "@/lib/editor/state/ui-store";

/**
 * Pointer over a clickable mesh. Tint only: hover changes often, and an outline
 * adds a full-screen pass per frame. The stroke is kept for the active mesh.
 */
const HOVER_STYLE: MeshHighlightStyle = {
  tintEnabled: true,
  tintColor: "#e63946",
  tintOpacity: 0.22,
  strokeEnabled: false,
  strokeColor: "#ffffff",
  strokeWidth: 1,
};

/** Its modal is open (Preview) or it's selected (editor). */
const ACTIVE_STYLE: MeshHighlightStyle = {
  tintEnabled: true,
  tintColor: "#3fb8af",
  tintOpacity: 0.32,
  strokeEnabled: true,
  strokeColor: "#3fb8af",
  strokeWidth: 2,
};

/**
 * Per-mesh styles to draw: mesh-click hover / active underneath, Highlight Mesh
 * node paint on top. Node paint is never overwritten, so ending a hover
 * reveals it again.
 */
export function effectiveMeshHighlights(): MeshHighlightById {
  const { byMeshId, hoverMeshId } = usePreviewMeshHighlightStore.getState();
  const editor = useEditorStore.getState();
  const activeHotspotId = editor.isPreview
    ? useUIStore.getState().previewActiveHotspotId
    : editor.selectedId;
  const activeMeshId =
    activeHotspotId != null ? (findHotspot(activeHotspotId)?.meshId ?? null) : null;

  if (!hoverMeshId && !activeMeshId) return byMeshId;
  const merged: MeshHighlightById = {};
  if (hoverMeshId) merged[hoverMeshId] = HOVER_STYLE;
  if (activeMeshId) merged[activeMeshId] = ACTIVE_STYLE;
  return { ...merged, ...byMeshId };
}
