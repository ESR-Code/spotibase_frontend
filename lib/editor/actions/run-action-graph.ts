import {
  APP_START_OWNER_ID,
  isStartOwnerId,
  ownerKeyFor,
  patchOwnedActionNodeData,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import { findCustomMenuButtonByOwnerId } from "@/lib/editor/actions/custom-menu-buttons";
import {
  createEmptyActionGraph,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { chainFrom, chainFromTrigger } from "@/lib/editor/actions/graph-ops";
import {
  httpRequestCacheKey,
  markHttpRequestCached,
} from "@/lib/editor/actions/http-request";
import {
  ACTION_NODE_META,
  type ActionRunContext,
} from "@/lib/editor/actions/registry";
import {
  clearPostMessageListeners,
  registerPostMessageReceive,
} from "@/lib/editor/actions/send-post-message";
import { useCustomMenuToggleStore } from "@/lib/editor/state/custom-menu-toggle-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  MENU_BUTTON_HANDLE_NORMAL,
  MENU_BUTTON_HANDLE_TOGGLED,
  TRIGGER_NODE_ID,
  type ActionNode,
  type HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import { focusHotspotCamera } from "@/lib/editor/preview/open-hotspot-in-preview";
import { toast } from "sonner";

export type { ActionRunContext };

export async function runActionNodeList(
  nodes: ActionNode[],
  ctx: ActionRunContext,
): Promise<void> {
  const visited = new Set<string>();

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!;
    if (visited.has(node.id)) break;
    visited.add(node.id);

    const meta = ACTION_NODE_META[node.type];
    const error = meta.validate(node);
    if (error) {
      toast.error(`${meta.label}: ${error}`);
      break;
    }

    if (
      node.type === "sendPostMessage" &&
      (node.data.mode ?? "send") === "receive"
    ) {
      if (!isStartOwnerId(ctx.ownerId)) {
        toast.error(
          "Post Message: Receive event is only available on App Start / Scene Start",
        );
        break;
      }

      const listenerKey = httpRequestCacheKey(ctx.ownerKey, node.id);
      const rest = nodes.slice(index + 1);
      const registerError = registerPostMessageReceive({
        listenerKey,
        eventName: node.data.eventName,
        onPayload: (payload) => {
          markHttpRequestCached(listenerKey, payload);
          try {
            patchOwnedActionNodeData(ctx.ownerId, node.id, {
              lastPayloadJson: JSON.stringify(payload),
            });
          } catch {
            // Ignore persistence failures; runtime store still has the value.
          }
          void runActionNodeList(rest, ctx);
        },
      });
      if (registerError) {
        toast.error(`Post Message: ${registerError}`);
      }
      // Wait for the event before running later nodes.
      break;
    }

    const result = await Promise.resolve(meta.run(node, ctx));
    if (result === "stop") break;
  }
}

/**
 * Walk an action chain from its trigger and run each node's handler.
 * Stops early if a node fails validation or returns `"stop"`.
 */
export async function runActionGraph(
  graph: HotspotActionGraph,
  ctx: ActionRunContext,
) {
  await runActionNodeList(chainFromTrigger(graph), ctx);
}

export async function runHotspotActions(hotspotId: number) {
  const hotspot = useEditorStore
    .getState()
    .hotspots.find((h) => h.id === hotspotId);
  if (!hotspot) return;

  const editor = useEditorStore.getState();
  editor.setHoveredHotspot(null);
  useUIStore.getState().setHoverTooltip(null);

  focusHotspotCamera(hotspotId);

  await runActionGraph(getActionGraph(hotspot), {
    hotspotId,
    ownerId: hotspotId,
    ownerKey: ownerKeyFor(hotspotId),
  });
}

export async function runAppStartActions() {
  const graph = useScenesStore.getState().appStartActions;
  await runActionGraph(graph, {
    hotspotId: null,
    ownerId: APP_START_OWNER_ID,
    ownerKey: ownerKeyFor(APP_START_OWNER_ID),
  });
}

export async function runSceneStartActions(sceneId?: string) {
  const state = useScenesStore.getState();
  const id = sceneId ?? state.activeSceneId;
  const scene = state.scenes.find((s) => s.id === id);
  if (!scene) return;

  // Replace scene-scoped receive listeners when entering a scene.
  clearPostMessageListeners("sceneStart:");

  await runActionGraph(scene.startActions ?? createEmptyActionGraph(), {
    hotspotId: null,
    ownerId: SCENE_START_OWNER_ID,
    ownerKey: ownerKeyFor(SCENE_START_OWNER_ID, id),
  });
}

export async function runCustomMenuButtonActions(ownerId: number) {
  const button = findCustomMenuButtonByOwnerId(ownerId);
  if (!button) return;

  const ctx = {
    hotspotId: null as number | null,
    ownerId,
    ownerKey: ownerKeyFor(ownerId),
  };

  if (!button.toggleEnabled) {
    await runActionGraph(button.actions, ctx);
    return;
  }

  const wasOn = useCustomMenuToggleStore.getState().isToggled(button.id);
  useCustomMenuToggleStore.getState().setToggled(button.id, !wasOn);
  const handle = wasOn
    ? MENU_BUTTON_HANDLE_TOGGLED
    : MENU_BUTTON_HANDLE_NORMAL;
  await runActionNodeList(
    chainFrom(button.actions, TRIGGER_NODE_ID, handle),
    ctx,
  );
}

/** App Start, then Scene Start for the active scene. */
export async function runPreviewStartActions() {
  clearPostMessageListeners();
  await runAppStartActions();
  await runSceneStartActions();
}
