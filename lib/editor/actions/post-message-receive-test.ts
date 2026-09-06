import { getOwnedActionGraph } from "@/lib/editor/actions/action-owners";
import {
  parsePostMessageTestNodeKey,
  postMessageTestNodeKey,
  usePreviewPostMessageTestStore,
} from "@/lib/editor/state/preview-post-message-test-store";
import { normalizeReceiveEvents } from "@/lib/editor/types/hotspot-action";

export type ReceiveTestEventOption = {
  key: string;
  ownerId: number;
  nodeId: string;
  eventId: string;
  eventName: string;
};

/** Enabled receive nodes that still exist on App Start or Scene Start. */
export function listActiveReceiveTestNodes(): {
  ownerId: number;
  nodeId: string;
}[] {
  const nodes: { ownerId: number; nodeId: string }[] = [];
  for (const key of usePreviewPostMessageTestStore.getState().enabledKeys) {
    const parsed = parsePostMessageTestNodeKey(key);
    if (!parsed) continue;
    const graph = getOwnedActionGraph(parsed.ownerId);
    const node = graph?.nodes.find((item) => item.id === parsed.nodeId);
    if (node?.type !== "sendPostMessage") continue;
    if ((node.data.mode ?? "send") !== "receive") continue;
    nodes.push(parsed);
  }
  return nodes;
}

export function listEnabledReceiveTestEvents(): ReceiveTestEventOption[] {
  const options: ReceiveTestEventOption[] = [];
  for (const nodeRef of listActiveReceiveTestNodes()) {
    const graph = getOwnedActionGraph(nodeRef.ownerId);
    const node = graph?.nodes.find((item) => item.id === nodeRef.nodeId);
    if (node?.type !== "sendPostMessage") continue;
    const key = postMessageTestNodeKey(nodeRef.ownerId, nodeRef.nodeId);
    for (const event of normalizeReceiveEvents(node.data)) {
      const eventName = event.eventName.trim();
      if (!eventName) continue;
      options.push({
        key,
        ownerId: nodeRef.ownerId,
        nodeId: nodeRef.nodeId,
        eventId: event.id,
        eventName,
      });
    }
  }
  return options;
}
