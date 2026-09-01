"use client";

import {
  APP_START_OWNER_ID,
  findNodeInSpawnTemplateActions,
  isHotspotOwnerId,
  isMenuButtonOwnerId,
  SPAWN_CLICK_LANE_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { ActionNode } from "@/lib/editor/types/hotspot-action";

/** Live action node for an owner — hotspot, start graph, or custom menu button. */
export function useOwnedActionNode(
  ownerId: number,
  nodeId: string | undefined,
): ActionNode | null {
  const spawnClick = useUIStore((s) => s.spawnClickActionsEditor);
  const isolated =
    ownerId === SPAWN_CLICK_LANE_OWNER_ID && spawnClick != null;

  const spawnClickFromHotspot = useEditorStore((s) => {
    if (!nodeId || !isolated || !spawnClick) return null;
    if (!isHotspotOwnerId(spawnClick.ownerId)) return null;
    const parent =
      s.hotspots.find((h) => h.id === spawnClick.ownerId)?.actions ?? null;
    return findNodeInSpawnTemplateActions(
      parent,
      spawnClick.nodeId,
      nodeId,
    );
  });

  const spawnClickFromStart = useScenesStore((s) => {
    if (!nodeId || !isolated || !spawnClick) return null;
    if (
      isHotspotOwnerId(spawnClick.ownerId) ||
      isMenuButtonOwnerId(spawnClick.ownerId)
    ) {
      return null;
    }
    const parent =
      spawnClick.ownerId === APP_START_OWNER_ID
        ? s.appStartActions
        : (s.scenes.find((sc) => sc.id === s.activeSceneId)?.startActions ??
          null);
    return findNodeInSpawnTemplateActions(
      parent,
      spawnClick.nodeId,
      nodeId,
    );
  });

  const spawnClickFromMenu = useSettingsStore((s) => {
    if (!nodeId || !isolated || !spawnClick) return null;
    if (!isMenuButtonOwnerId(spawnClick.ownerId)) return null;
    const parent =
      s.customMenuButtons.find((button) => button.ownerId === spawnClick.ownerId)
        ?.actions ?? null;
    return findNodeInSpawnTemplateActions(
      parent,
      spawnClick.nodeId,
      nodeId,
    );
  });

  const hotspotNode = useEditorStore((s) => {
    if (!nodeId || isolated || !isHotspotOwnerId(ownerId)) return null;
    return (
      s.hotspots
        .find((h) => h.id === ownerId)
        ?.actions?.nodes.find((n) => n.id === nodeId) ?? null
    );
  });

  const startNode = useScenesStore((s) => {
    if (
      !nodeId ||
      isolated ||
      ownerId === SPAWN_CLICK_LANE_OWNER_ID ||
      isHotspotOwnerId(ownerId) ||
      isMenuButtonOwnerId(ownerId)
    ) {
      return null;
    }
    const graph =
      ownerId === APP_START_OWNER_ID
        ? s.appStartActions
        : (s.scenes.find((sc) => sc.id === s.activeSceneId)?.startActions ??
          null);
    return graph?.nodes.find((n) => n.id === nodeId) ?? null;
  });

  const menuNode = useSettingsStore((s) => {
    if (!nodeId || isolated || !isMenuButtonOwnerId(ownerId)) return null;
    return (
      s.customMenuButtons
        .find((button) => button.ownerId === ownerId)
        ?.actions.nodes.find((n) => n.id === nodeId) ?? null
    );
  });

  return (
    spawnClickFromHotspot ??
    spawnClickFromStart ??
    spawnClickFromMenu ??
    hotspotNode ??
    startNode ??
    menuNode
  );
}
