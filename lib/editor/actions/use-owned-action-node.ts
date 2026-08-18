"use client";

import {
  APP_START_OWNER_ID,
  isHotspotOwnerId,
  isMenuButtonOwnerId,
} from "@/lib/editor/actions/action-owners";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { ActionNode } from "@/lib/editor/types/hotspot-action";

/** Live action node for an owner — hotspot, start graph, or custom menu button. */
export function useOwnedActionNode(
  ownerId: number,
  nodeId: string | undefined,
): ActionNode | null {
  const hotspotNode = useEditorStore((s) => {
    if (!nodeId || !isHotspotOwnerId(ownerId)) return null;
    return (
      s.hotspots
        .find((h) => h.id === ownerId)
        ?.actions?.nodes.find((n) => n.id === nodeId) ?? null
    );
  });

  const startNode = useScenesStore((s) => {
    if (!nodeId || isHotspotOwnerId(ownerId) || isMenuButtonOwnerId(ownerId)) {
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
    if (!nodeId || !isMenuButtonOwnerId(ownerId)) return null;
    return (
      s.customMenuButtons
        .find((button) => button.ownerId === ownerId)
        ?.actions.nodes.find((n) => n.id === nodeId) ?? null
    );
  });

  return hotspotNode ?? startNode ?? menuNode;
}
