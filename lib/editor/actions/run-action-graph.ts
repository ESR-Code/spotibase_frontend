import {
  APP_START_OWNER_ID,
  getOwnedActionGraph,
  isStartOwnerId,
  ownerKeyFor,
  SCENE_START_OWNER_ID,
} from "@/lib/editor/actions/action-owners";
import { isButtonBlock } from "@/lib/editor/blocks/content-buttons";
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
  freshRunContext,
  type ActionRunContext,
} from "@/lib/editor/actions/registry";
import {
  clearPostMessageListeners,
  registerPostMessageReceive,
} from "@/lib/editor/actions/send-post-message";
import {
  cancelPendingWaits,
  currentRunGeneration,
} from "@/lib/editor/actions/wait";
import { useCustomMenuToggleStore } from "@/lib/editor/state/custom-menu-toggle-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { withItemScope } from "@/lib/editor/actions/interpolate-fields";
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
import { toast } from "@/lib/editor/toast";

export type { ActionRunContext };

export async function runActionNodeList(
  nodes: ActionNode[],
  ctx: ActionRunContext,
): Promise<void> {
  const visited = new Set<string>();
  // A run belongs to the generation it started under. Leaving / entering
  // Preview or switching scene bumps it and the run stops before its next node.
  const generation = ctx.runGeneration ?? currentRunGeneration();
  ctx = ctx.runGeneration === generation ? ctx : { ...ctx, runGeneration: generation };

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!;
    if (generation !== currentRunGeneration()) break;
    if (visited.has(node.id)) break;
    visited.add(node.id);

    if (ctx.runPath?.includes(node.id)) {
      toast.error(
        "Action loop detected: a node leads back to itself. Run stopped.",
      );
      break;
    }

    const meta = ACTION_NODE_META[node.type];
    const error = withItemScope(ctx.itemScope, () => meta.validate(node));
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
          allowedOrigins: node.data.allowedOrigins,
          onPayload: (payload) => {
            markHttpRequestCached(
              httpRequestCacheKey(ctx.ownerKey, node.id),
              payload,
            );
            markHttpRequestCached(listenerKey, payload);

            const latestGraph = getOwnedActionGraph(ctx.ownerId);
            if (!latestGraph) return;
            const chain = chainFrom(latestGraph, node.id, handleId);
            // A received message starts a new run (App Start listeners outlive scenes).
            void runActionNodeList(chain, freshRunContext(ctx));
          },
        });
        if (registerError) {
          toast.error(`Post Message: ${registerError}`);
        }
      }
      // Wait for an event before running that event's outgoing chain.
      break;
    }

    // Only the synchronous start of `run` sees the item scope as ambient
    // state; later reads must use ctx.itemScope (see withItemScope callers).
    const nodeCtx = { ...ctx, runPath: [...(ctx.runPath ?? []), node.id] };
    const result = await Promise.resolve(
      withItemScope(ctx.itemScope, () => meta.run(node, nodeCtx)),
    );
    if (generation !== currentRunGeneration()) break;
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

  const spawned = usePreviewSpawnedHotspotsStore.getState().findEntry(hotspotId);
  await runActionGraph(getActionGraph(hotspot), {
    hotspotId,
    ownerId: hotspotId,
    ownerKey: ownerKeyFor(hotspotId),
    itemScope: spawned ? { item: spawned.item, index: spawned.index } : undefined,
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

  // Replace scene-scoped receive listeners, polls, and waits when entering a scene.
  cancelPendingWaits();
  clearPostMessageListeners("sceneStart:");
  const { clearSubscribePolls } = await import(
    "@/lib/editor/actions/subscribe"
  );
  clearSubscribePolls("sceneStart:");
  clearSubscribePolls("menuButton:");
  clearSubscribePolls("contentButton:");
  clearSubscribePolls("h:");

  await runActionGraph(scene.startActions ?? createEmptyActionGraph(), {
    hotspotId: null,
    ownerId: SCENE_START_OWNER_ID,
    ownerKey: ownerKeyFor(SCENE_START_OWNER_ID, id),
  });
}

export async function runContentButtonActions(
  ownerId: number,
  hotspotId: number,
) {
  const { findHotspot } = await import("@/lib/editor/state/preview-hotspots");
  const hotspot = findHotspot(hotspotId);
  const block = hotspot?.blocks.find(
    (item) => isButtonBlock(item) && item.ownerId === ownerId,
  );
  if (!block || !isButtonBlock(block)) return;

  await runActionGraph(block.actions, {
    hotspotId,
    ownerId,
    ownerKey: ownerKeyFor(ownerId),
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
