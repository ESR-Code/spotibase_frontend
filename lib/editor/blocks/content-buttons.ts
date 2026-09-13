import {
  cloneActionGraph,
  createEmptyActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import {
  CONTENT_BUTTON_OWNER_BASE,
  isContentButtonOwnerId,
} from "@/lib/editor/blocks/content-button-ids";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewSpawnedHotspotsStore } from "@/lib/editor/state/preview-spawned-hotspots-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  ButtonBlock,
  HotspotBlock,
} from "@/lib/editor/types/hotspot-block";

export {
  CONTENT_BUTTON_OWNER_BASE,
  isContentButtonOwnerId,
} from "@/lib/editor/blocks/content-button-ids";

const reservedOwnerIds = new Set<number>();

export function isButtonBlock(block: HotspotBlock): block is ButtonBlock {
  return block.type === "button";
}

export function listButtonBlocks(
  hotspots: Hotspot[],
): Array<{ hotspot: Hotspot; block: ButtonBlock }> {
  const result: Array<{ hotspot: Hotspot; block: ButtonBlock }> = [];
  for (const hotspot of hotspots) {
    for (const block of hotspot.blocks) {
      if (isButtonBlock(block)) result.push({ hotspot, block });
    }
  }
  return result;
}

function collectKnownOwnerIds(): number[] {
  const ids: number[] = [...reservedOwnerIds];
  const pushFrom = (hotspots: Hotspot[]) => {
    for (const hotspot of hotspots) {
      for (const block of hotspot.blocks) {
        if (isButtonBlock(block)) ids.push(block.ownerId);
      }
    }
  };
  pushFrom(useEditorStore.getState().hotspots);
  pushFrom(usePreviewSpawnedHotspotsStore.getState().list());
  for (const scene of useScenesStore.getState().scenes) {
    pushFrom(scene.hotspots);
  }
  return ids;
}

export function nextContentButtonOwnerId(): number {
  const known = collectKnownOwnerIds().filter(isContentButtonOwnerId);
  const next =
    known.length === 0 ? CONTENT_BUTTON_OWNER_BASE : Math.min(...known) - 1;
  if (!isContentButtonOwnerId(next)) {
    return CONTENT_BUTTON_OWNER_BASE;
  }
  reservedOwnerIds.add(next);
  return next;
}

function findButtonInHotspots(
  hotspots: Hotspot[],
  ownerId: number,
): { hotspot: Hotspot; block: ButtonBlock } | null {
  for (const hotspot of hotspots) {
    for (const block of hotspot.blocks) {
      if (isButtonBlock(block) && block.ownerId === ownerId) {
        return { hotspot, block };
      }
    }
  }
  return null;
}

export function findContentButtonByOwnerId(
  ownerId: number,
): { hotspot: Hotspot; block: ButtonBlock } | null {
  const live = findButtonInHotspots(
    useEditorStore.getState().hotspots,
    ownerId,
  );
  if (live) return live;

  for (const scene of useScenesStore.getState().scenes) {
    const match = findButtonInHotspots(scene.hotspots, ownerId);
    if (match) return match;
  }

  return findButtonInHotspots(
    usePreviewSpawnedHotspotsStore.getState().list(),
    ownerId,
  );
}

export function listContentButtonGraphs(): Array<{
  ownerId: number;
  label: string;
  graph: ReturnType<typeof cloneActionGraph>;
}> {
  const seen = new Set<number>();
  const result: Array<{
    ownerId: number;
    label: string;
    graph: ReturnType<typeof cloneActionGraph>;
  }> = [];

  const push = (hotspot: Hotspot, block: ButtonBlock) => {
    if (seen.has(block.ownerId)) return;
    seen.add(block.ownerId);
    result.push({
      ownerId: block.ownerId,
      label: `${hotspot.title}: ${block.label.trim() || "Action button"}`,
      graph: cloneActionGraph(block.actions),
    });
  };

  for (const { hotspot, block } of listButtonBlocks(
    useEditorStore.getState().hotspots,
  )) {
    push(hotspot, block);
  }

  for (const { hotspot, block } of listButtonBlocks(
    usePreviewSpawnedHotspotsStore.getState().list(),
  )) {
    push(hotspot, block);
  }

  const scenes = useScenesStore.getState();
  for (const scene of scenes.scenes) {
    if (scene.id === scenes.activeSceneId) continue;
    for (const { hotspot, block } of listButtonBlocks(scene.hotspots)) {
      push(hotspot, block);
    }
  }

  return result;
}

export function cloneButtonBlock(
  block: ButtonBlock,
  remintOwner = false,
): ButtonBlock {
  return {
    ...block,
    ownerId: remintOwner ? nextContentButtonOwnerId() : block.ownerId,
    actions: cloneActionGraph(block.actions ?? createEmptyActionGraph()),
  };
}

export function cloneHotspotBlocks(
  blocks: HotspotBlock[],
  remintContentButtons = false,
): HotspotBlock[] {
  return blocks.map((block) => {
    if (block.type === "image") {
      return {
        ...block,
        items: block.items.map((item) => ({ ...item })),
      };
    }
    if (isButtonBlock(block)) {
      return cloneButtonBlock(block, remintContentButtons);
    }
    return { ...block };
  });
}
