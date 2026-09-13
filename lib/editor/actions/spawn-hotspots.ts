import { findActionNodeOwner } from "@/lib/editor/actions/action-owners";
import {
  hasAncestorOfType,
  hasForEachAncestor,
} from "@/lib/editor/actions/for-each";
import { nodesReachableFrom } from "@/lib/editor/actions/graph-ops";
import {
  interpolatePlainText,
  interpolateRichTextHtml,
  peekActionItemScope,
} from "@/lib/editor/actions/interpolate-fields";
import { cloneActionGraph, createDefaultActionGraph } from "@/lib/editor/actions/create-action-graph";
import { geoToScene } from "@/lib/editor/coords/scene-coords";
import { createHotspotData } from "@/lib/editor/state/editor-store";
import { findHotspotIndex } from "@/lib/editor/state/preview-hotspots";
import {
  usePreviewSpawnedHotspotsStore,
} from "@/lib/editor/state/preview-spawned-hotspots-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";
import type {
  ActionNode,
  HotspotActionGraph,
  SpawnCoordMode,
  SpawnHotspotTemplate,
  SpawnHotspotsActionNode,
} from "@/lib/editor/types/hotspot-action";
import type { Vec3 } from "@/lib/editor/types/hotspot";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";

function interpolateOptional(value: string): string {
  return interpolatePlainText(value);
}

function parseCoord(raw: string): number | null {
  const text = interpolatePlainText(raw).trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function interpolateBlocks(blocks: HotspotBlock[]): HotspotBlock[] {
  return blocks.map((block) => {
    if (block.type === "link") {
      return {
        ...block,
        label: interpolatePlainText(block.label),
        url: interpolatePlainText(block.url),
      };
    }
    if (block.type === "image") {
      return {
        ...block,
        items: block.items.map((item) => ({
          ...item,
          caption: interpolatePlainText(item.caption),
        })),
      };
    }
    if (block.type === "video") {
      return {
        ...block,
        url: interpolatePlainText(block.url),
      };
    }
    return {
      ...block,
      content: interpolateRichTextHtml(block.content),
    };
  });
}

function resolvedCoordMode(mode: SpawnCoordMode): "xyz" | "latlon" {
  if (mode !== "auto") return mode;
  const scene = useScenesStore.getState();
  const active =
    scene.scenes.find((s) => s.id === scene.activeSceneId) ?? scene.scenes[0];
  return active?.type === "geo" ? "latlon" : "xyz";
}

function resolvePosition(
  template: SpawnHotspotTemplate,
  coordMode: SpawnCoordMode,
): Vec3 | null {
  const x = parseCoord(template.positionX);
  const y = parseCoord(template.positionY);
  const z = parseCoord(template.positionZ) ?? 0;
  if (x == null || y == null) return null;

  const mode = resolvedCoordMode(coordMode);
  const scenes = useScenesStore.getState();
  const active =
    scenes.scenes.find((s) => s.id === scenes.activeSceneId) ?? scenes.scenes[0];

  if (mode === "latlon") {
    if (active?.type === "geo") {
      return { x, y, z: 0 };
    }
    if (!active || !isAlignedGeoReference(active.geoReference)) {
      return null;
    }
    const converted = geoToScene(active.id, {
      longitude: x,
      latitude: y,
    });
    if (!converted.ok) return null;
    return converted.local;
  }

  return { x, y, z };
}

export const SPAWN_NEEDS_FOR_EACH_MESSAGE =
  "Connect after For Each (Switch in between is OK)";
export const SPAWN_NEEDS_FOR_EACH_BEFORE_SWITCH_MESSAGE =
  "Connect For Each before this Switch";

export function validateSpawnHotspotsData(node: ActionNode): string | null {
  if (node.type !== "spawnHotspots") return null;
  if (!peekActionItemScope()) {
    const found = findActionNodeOwner(node.id);
    if (!found || !hasForEachAncestor(found.graph, node.id)) {
      if (found && hasAncestorOfType(found.graph, node.id, "switch")) {
        return SPAWN_NEEDS_FOR_EACH_BEFORE_SWITCH_MESSAGE;
      }
      return SPAWN_NEEDS_FOR_EACH_MESSAGE;
    }
  }

  const mode = resolvedCoordMode(node.data.coordMode);
  if (mode === "latlon") {
    const scenes = useScenesStore.getState();
    const active =
      scenes.scenes.find((s) => s.id === scenes.activeSceneId) ??
      scenes.scenes[0];
    if (
      active &&
      active.type !== "geo" &&
      !isAlignedGeoReference(active.geoReference)
    ) {
      return "Lat / Lon needs a Geo Map or a georeferenced 3D scene";
    }
  }
  return null;
}

export function applySpawnHotspots(
  node: SpawnHotspotsActionNode,
  ctx: { ownerKey: string },
): void {
  const scope = peekActionItemScope();
  if (!scope) return;

  const sourceKey = `${ctx.ownerKey}:${node.id}`;
  const store = usePreviewSpawnedHotspotsStore.getState();
  if (node.data.replaceOnRerun && store.pending[sourceKey] == null) {
    store.beginPass(sourceKey);
  }

  const position = resolvePosition(node.data.template, node.data.coordMode);
  if (!position) return;

  const template = node.data.template;
  const title =
    interpolateOptional(template.title).trim() ||
    `Hotspot ${String(scope.index + 1).padStart(3, "0")}`;
  const numberText = interpolateOptional(template.number).trim();
  const numberFallback = String(scope.index + 1);
  const fields = {
    title,
    desc: interpolateOptional(template.desc),
    image: interpolateOptional(template.image),
    type: template.type,
    color: interpolateOptional(template.color) || template.color,
    style: template.style,
    shape: template.shape,
    number: numberText || numberFallback,
    icon: interpolateOptional(template.icon) || template.icon,
    markerImage: interpolateOptional(template.markerImage),
    pulse: template.pulse,
    wick: template.wick,
    category: interpolateOptional(template.category),
    legendName: interpolateOptional(template.legendName) || title,
    blocks: interpolateBlocks(template.blocks),
    actions: cloneActionGraph(
      template.actions ?? createDefaultActionGraph(),
    ),
  };

  if (node.data.replaceOnRerun) {
    store.upsertPending(
      sourceKey,
      spawnItemKey(scope.item, scope.index),
      (id, previous) =>
        createHotspotData(id, position, {
          ...fields,
          customCamera: previous?.customCamera ?? null,
          customCameraEnabled: previous?.customCameraEnabled ?? false,
        }),
      scope.item,
      scope.index,
    );
    return;
  }

  const id = store.allocateId();
  store.append(
    sourceKey,
    createHotspotData(id, position, fields),
    scope.item,
    scope.index,
  );
}

/** Stable identity across Subscribe polls so an open modal is not torn down. */
export function spawnItemKey(item: unknown, index: number): string {
  if (item != null && typeof item === "object") {
    const rec = item as Record<string, unknown>;
    if (rec.id != null && rec.id !== "") return `id:${String(rec.id)}`;
    if (typeof rec.key === "string" && rec.key.trim()) {
      return `key:${rec.key.trim()}`;
    }
  }
  return `i:${index}`;
}

/** Start replace passes for Spawn nodes after this For Each, including Switch branches. */
export function beginSpawnReplacePassesFromForEach(
  ownerKey: string,
  graph: HotspotActionGraph,
  forEachId: string,
): void {
  const store = usePreviewSpawnedHotspotsStore.getState();
  for (const child of nodesReachableFrom(graph, forEachId)) {
    if (child.type === "spawnHotspots" && child.data.replaceOnRerun) {
      store.beginPass(`${ownerKey}:${child.id}`);
    }
  }
}

export function commitSpawnReplacePasses(): void {
  usePreviewSpawnedHotspotsStore.getState().commitPasses();

  const ui = useUIStore.getState();
  if (!ui.previewModalOpen || ui.previewActiveHotspotId == null) return;
  const index = findHotspotIndex(ui.previewActiveHotspotId);
  if (index < 0) {
    ui.setPreviewModalOpen(false);
    ui.setPreviewActiveHotspotId(null);
    ui.setPreviewLabelPending(false);
    ui.setHoverTooltip(null);
    ui.setInfoBoxAnchor(null);
    return;
  }
  ui.setPreviewModalIndex(index);
}

export { resolvedCoordMode };

/** @internal used by the template drawer labels */
export function spawnUsesLatLon(coordMode: SpawnCoordMode): boolean {
  return resolvedCoordMode(coordMode) === "latlon";
}
