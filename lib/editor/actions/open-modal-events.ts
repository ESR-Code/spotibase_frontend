import {
  getOwnedActionGraph,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import { chainFrom } from "@/lib/editor/actions/graph-ops";
import type { ActionRunContext } from "@/lib/editor/actions/registry";
import { OPEN_MODAL_HANDLE_ON_CLOSE } from "@/lib/editor/types/hotspot-action";

export type OpenModalCloseRegistration = {
  ownerId: number;
  nodeId: string;
  hotspotId: number;
  ownerKey: string;
};

let pendingClose: OpenModalCloseRegistration | null = null;
let firingClose = false;

export function getPendingOpenModalClose(): OpenModalCloseRegistration | null {
  return pendingClose;
}

export function clearOpenModalCloseHandler(): void {
  pendingClose = null;
}

/**
 * Remember which Open Modal node should run its onClose branch when the
 * preview dialog closes. Replacing an active registration fires the previous
 * onClose first (e.g. switching hotspots while the dialog stays open).
 */
export function registerOpenModalCloseHandler(
  registration: OpenModalCloseRegistration,
): void {
  const previous = pendingClose;
  pendingClose = registration;

  if (
    previous &&
    (previous.hotspotId !== registration.hotspotId ||
      previous.nodeId !== registration.nodeId ||
      previous.ownerId !== registration.ownerId)
  ) {
    void fireOpenModalClose(previous);
  }
}

async function fireOpenModalClose(
  registration: OpenModalCloseRegistration,
): Promise<void> {
  const { findHotspot } = await import("@/lib/editor/state/preview-hotspots");
  const { getActionGraph } = await import(
    "@/lib/editor/actions/create-action-graph"
  );
  const hotspot = findHotspot(registration.hotspotId);
  const graph = hotspot
    ? getActionGraph(hotspot)
    : getOwnedActionGraph(registration.ownerId);
  if (!graph) return;
  const chain = chainFrom(
    graph,
    registration.nodeId,
    OPEN_MODAL_HANDLE_ON_CLOSE,
  );
  if (chain.length === 0) return;

  const { runActionNodeList } = await import(
    "@/lib/editor/actions/run-action-graph"
  );
  const { withActionItemScope } = await import(
    "@/lib/editor/actions/interpolate-fields"
  );
  const { usePreviewSpawnedHotspotsStore } = await import(
    "@/lib/editor/state/preview-spawned-hotspots-store"
  );
  const ctx: ActionRunContext = {
    hotspotId: registration.hotspotId,
    ownerId: registration.ownerId,
    ownerKey: registration.ownerKey || ownerKeyFor(registration.ownerId),
  };
  const run = () => runActionNodeList(chain, ctx);
  const spawned = usePreviewSpawnedHotspotsStore
    .getState()
    .findEntry(registration.hotspotId);
  if (spawned) {
    await withActionItemScope(spawned.item, spawned.index, run);
    return;
  }
  await run();
}

/** Call when the preview modal / drawer / infobox transitions open → closed. */
export function notifyPreviewModalClosed(): void {
  if (firingClose) return;
  const registration = pendingClose;
  pendingClose = null;
  if (!registration) return;
  firingClose = true;
  void fireOpenModalClose(registration).finally(() => {
    firingClose = false;
  });
}
