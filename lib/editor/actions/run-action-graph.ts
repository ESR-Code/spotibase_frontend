import {
  APP_START_OWNER_ID,
  getOwnedActionGraph,
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
import { cancelPendingWaits } from "@/lib/editor/actions/wait";
import { useCustomMenuToggleStore } from "@/lib/editor/state/custom-menu-toggle-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { withActionItemScope } from "@/lib/editor/actions/interpolate-fields";
import { usePreviewSpawnedHotspotsStore } from "@/lib/editor/state/preview-spawned-hotspots-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  MENU_BUTTON_HANDLE_NORMAL,
  MENU_BUTTON_HANDLE_TOGGLED,
  normalizeReceiveEvents,
  postMessageReceiveHandleId,
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

      const events = normalizeReceiveEvents(node.data);
      const namedEvents = events.filter((event) => event.eventName.trim());
      if (namedEvents.length === 0) {
        toast.error("Post Message: Enter an event name");
        break;
      }

      const nodePrefix = `${httpRequestCacheKey(ctx.ownerKey, node.id)}:pm:`;
      clearPostMessageListeners(nodePrefix);

      for (const event of namedEvents) {
        const handleId = postMessageReceiveHandleId(event.id);
        const listenerKey = `${nodePrefix}${event.id}`;
        const registerError = registerPostMessageReceive({
          listenerKey,
          eventName: event.eventName,
          onPayload: (payload) => {
            const payloadJson = JSON.stringify(payload);
            markHttpRequestCached(
              httpRequestCacheKey(ctx.ownerKey, node.id),
              payload,
            );
            markHttpRequestCached(listenerKey, payload);
            try {
              const latestGraph = getOwnedActionGraph(ctx.ownerId);
              const latestNode = latestGraph?.nodes.find(
                (item) => item.id === node.id,
              );
              const latestEvents =
                latestNode?.type === "sendPostMessage"
                  ? normalizeReceiveEvents(latestNode.data)
                  : events;
              const nextEvents = latestEvents.map((item) =>
                item.id === event.id
                  ? { ...item, lastPayloadJson: payloadJson }
                  : item,
              );
              patchOwnedActionNodeData(ctx.ownerId, node.id, {
                lastPayloadJson: payloadJson,
                receiveEvents: nextEvents,
              });
            } catch {
              // Ignore persistence failures; runtime store still has the value.
            }

            const latestGraph = getOwnedActionGraph(ctx.ownerId);
            if (!latestGraph) return;
            const chain = chainFrom(latestGraph, node.id, handleId);
            void runActionNodeList(chain, ctx);
          },
        });
        if (registerError) {
          toast.error(`Post Message: ${registerError}`);
        }
      }
      // Wait for an event before running that event's outgoing chain.
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
  const { findHotspot } = await import("@/lib/editor/state/preview-hotspots");
  const hotspot = findHotspot(hotspotId);
  if (!hotspot) return;

  const editor = useEditorStore.getState();
  editor.setHoveredHotspot(null);
  useUIStore.getState().setHoverTooltip(null);

  focusHotspotCamera(hotspotId);

  const ctx = {
    hotspotId,
    ownerId: hotspotId,
    ownerKey: ownerKeyFor(hotspotId),
  };
  const run = () => runActionGraph(getActionGraph(hotspot), ctx);
  const spawned = usePreviewSpawnedHotspotsStore.getState().findEntry(hotspotId);
  if (spawned) {
    await withActionItemScope(spawned.item, spawned.index, run);
    return;
  }
  await run();
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

  // Replace scene-scoped receive listeners, polls, and waits when entering a scene.
  cancelPendingWaits();
  clearPostMessageListeners("sceneStart:");
  const { clearSubscribePolls } = await import(
    "@/lib/editor/actions/subscribe"
  );
  clearSubscribePolls("sceneStart:");
  clearSubscribePolls("menuButton:");
  clearSubscribePolls("h:");

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
