import {
  cloneActionGraph,
  remintActionGraph,
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
import type { SceneDialog } from "@/lib/editor/types/scene-dialog";

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
  const pushFrom = (owners: Array<{ blocks: HotspotBlock[] }>) => {
    for (const owner of owners) {
      for (const block of owner.blocks) {
        if (isButtonBlock(block)) ids.push(block.ownerId);
      }
    }
  };
  pushFrom(useEditorStore.getState().hotspots);
  pushFrom(usePreviewSpawnedHotspotsStore.getState().list());
  for (const scene of useScenesStore.getState().scenes) {
    pushFrom(scene.hotspots);
    pushFrom(scene.dialogs ?? []);
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

/** Where an Action button block lives: a hotspot's content or a scene dialog. */
export type ContentButtonMatch =
  | { kind: "hotspot"; hotspot: Hotspot; block: ButtonBlock }
  | { kind: "dialog"; sceneId: string; dialog: SceneDialog; block: ButtonBlock };

function findButtonInDialogs(
  dialogs: SceneDialog[],
  ownerId: number,
): { dialog: SceneDialog; block: ButtonBlock } | null {
  for (const dialog of dialogs) {
    for (const block of dialog.blocks) {
      if (isButtonBlock(block) && block.ownerId === ownerId) {
        return { dialog, block };
      }
    }
  }
  return null;
}

export function findContentButtonByOwnerId(
  ownerId: number,
): ContentButtonMatch | null {
  const live = findButtonInHotspots(
    useEditorStore.getState().hotspots,
    ownerId,
  );
  if (live) return { kind: "hotspot", ...live };

  const scenes = useScenesStore.getState();
  // Active scene dialogs first: they are the ones Preview can show.
  const ordered = [...scenes.scenes].sort(
    (a, b) =>
      Number(b.id === scenes.activeSceneId) -
      Number(a.id === scenes.activeSceneId),
  );
  for (const scene of ordered) {
    const inDialog = findButtonInDialogs(scene.dialogs ?? [], ownerId);
    if (inDialog) return { kind: "dialog", sceneId: scene.id, ...inDialog };
  }

  for (const scene of scenes.scenes) {
    const match = findButtonInHotspots(scene.hotspots, ownerId);
    if (match) return { kind: "hotspot", ...match };
  }

  const spawned = findButtonInHotspots(
    usePreviewSpawnedHotspotsStore.getState().list(),
    ownerId,
  );
  return spawned ? { kind: "hotspot", ...spawned } : null;
}

/** Action button blocks inside scene dialogs. */
export function listDialogButtonBlocks(
  dialogs: SceneDialog[],
): Array<{ dialog: SceneDialog; block: ButtonBlock }> {
  const result: Array<{ dialog: SceneDialog; block: ButtonBlock }> = [];
  for (const dialog of dialogs) {
    for (const block of dialog.blocks) {
      if (isButtonBlock(block)) result.push({ dialog, block });
    }
  }
  return result;
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

  const push = (owner: { title: string }, block: ButtonBlock) => {
    if (seen.has(block.ownerId)) return;
    seen.add(block.ownerId);
    result.push({
      ownerId: block.ownerId,
      label: `${owner.title}: ${block.label.trim() || "Action button"}`,
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
    for (const { dialog, block } of listDialogButtonBlocks(
      scene.dialogs ?? [],
    )) {
      push({ title: dialog.title }, block);
    }
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
  const source = block.actions ?? createEmptyActionGraph();
  // A reminted copy is a new canvas owner: fresh node ids, and let the canvas
  // give it a free lane.
  const actions = remintOwner ? remintActionGraph(source) : cloneActionGraph(source);
  if (remintOwner) delete actions.laneY;
  return {
    ...block,
    ownerId: remintOwner ? nextContentButtonOwnerId() : block.ownerId,
    actions,
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

export function cloneSceneDialogs(
  dialogs: SceneDialog[],
  remintContentButtons = false,
): SceneDialog[] {
  return dialogs.map((dialog) => ({
    ...dialog,
    blocks: cloneHotspotBlocks(dialog.blocks, remintContentButtons),
  }));
}
