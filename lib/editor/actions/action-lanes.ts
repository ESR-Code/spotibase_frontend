import {
  createDefaultActionGraph,
  createEmptyActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { LANE_HEIGHT } from "@/lib/editor/actions/flow-adapter";
import { isButtonBlock } from "@/lib/editor/blocks/content-buttons";
import type { ActionFence } from "@/lib/editor/types/action-fence";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type { Scene } from "@/lib/editor/types/scene";

/** Rough node height used when a lane's measured size is unknown. */
const LANE_CONTENT_ESTIMATE = 240;
/** Space left between existing content and a newly placed lane. */
const LANE_GAP = 80;

export type LaneOwner = { ownerId: number; graph: HotspotActionGraph };

/** Lowest canvas Y used by a lane (its trigger / nodes plus an estimated node height). */
function laneBottom(graph: HotspotActionGraph, originY: number): number {
  let maxY = graph.trigger.position.y;
  for (const node of graph.nodes) maxY = Math.max(maxY, node.position.y);
  return originY + maxY + LANE_CONTENT_ESTIMATE;
}

/**
 * Canvas Y origin for every owner. Owners with a stored `laneY` keep it; the
 * rest are stacked, in order, below everything already on the canvas (lanes
 * and fences), so a new owner never lands on or shifts existing nodes.
 */
export function resolveLaneOrigins(
  owners: LaneOwner[],
  fences: ActionFence[],
): Map<number, number> {
  const origins = new Map<number, number>();
  let bottom = -Infinity;
  for (const { ownerId, graph } of owners) {
    if (typeof graph.laneY !== "number") continue;
    origins.set(ownerId, graph.laneY);
    bottom = Math.max(bottom, laneBottom(graph, graph.laneY));
  }
  for (const fence of fences) bottom = Math.max(bottom, fence.y + fence.height);

  for (const { ownerId, graph } of owners) {
    if (origins.has(ownerId)) continue;
    const firstY = Math.min(
      graph.trigger.position.y,
      ...graph.nodes.map((node) => node.position.y),
    );
    // Place the lane's top content just below the current bottom.
    const originY =
      bottom === -Infinity ? 0 : Math.round(bottom + LANE_GAP - firstY);
    origins.set(ownerId, originY);
    bottom = Math.max(bottom, laneBottom(graph, originY));
  }
  return origins;
}

function withLaneY<T extends HotspotActionGraph>(graph: T, laneY: number): T {
  return typeof graph.laneY === "number" ? graph : { ...graph, laneY };
}

/**
 * Older saves have no `laneY`: lanes were stacked by list position. Freeze that
 * layout on load (same order the canvas used) so later owner changes can't shift it.
 */
export function stampLegacySceneLanes(scene: Scene): Scene {
  let lane = 1; // 0 is the project-wide App Start lane.
  const next = (graph: HotspotActionGraph | null | undefined) =>
    withLaneY(graph ?? createEmptyActionGraph(), lane++ * LANE_HEIGHT);

  const startActions = next(scene.startActions);
  const legendActions = scene.settings.legendEnabled
    ? next(scene.legendActions)
    : scene.legendActions;
  const customMenuButtons = scene.settings.customMenuButtons.map((button) => ({
    ...button,
    actions: next(button.actions),
  }));
  const hotspots = scene.hotspots.map((hotspot) => ({
    ...hotspot,
    actions: next(hotspot.actions ?? createDefaultActionGraph()),
  }));
  // Content-button lanes come after every hotspot lane.
  const withBlocks = hotspots.map((hotspot) => ({
    ...hotspot,
    blocks: hotspot.blocks.map((block) =>
      isButtonBlock(block) ? { ...block, actions: next(block.actions) } : block,
    ),
  }));

  return {
    ...scene,
    startActions,
    legendActions,
    settings: { ...scene.settings, customMenuButtons },
    hotspots: withBlocks,
  };
}

export function stampLegacyAppStartLane(graph: HotspotActionGraph): HotspotActionGraph {
  return withLaneY(graph, 0);
}
