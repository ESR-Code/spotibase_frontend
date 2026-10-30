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
  /** Hotspot of the run that opened it; null for start / menu / Action button runs. */
  hotspotId: number | null;
  /** Scene dialog shown, when the node opened one instead of the hotspot. */
  dialogId?: string;
  ownerKey: string;
  /** Hand-off chain of the run that opened the modal (see ActionRunContext). */
  hotspotChain?: readonly number[];
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
      previous.dialogId !== registration.dialogId ||
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
  // Hotspot graphs come from the hotspot (spawned ones are not owned lanes);
  // start / menu / Action button graphs from their owner.
  const hotspot =
    registration.hotspotId === registration.ownerId &&
    registration.hotspotId != null
      ? findHotspot(registration.hotspotId)
      : null;
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
  const { usePreviewSpawnedHotspotsStore } = await import(
    "@/lib/editor/state/preview-spawned-hotspots-store"
  );
  const spawned =
    registration.hotspotId != null
      ? usePreviewSpawnedHotspotsStore
          .getState()
          .findEntry(registration.hotspotId)
      : null;
  const ctx: ActionRunContext = {
    hotspotId: registration.hotspotId,
    ownerId: registration.ownerId,
    ownerKey: registration.ownerKey || ownerKeyFor(registration.ownerId),
    hotspotChain: registration.hotspotChain,
    itemScope: spawned
      ? { item: spawned.item, index: spawned.index }
      : undefined,
  };
  await runActionNodeList(chain, ctx);
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
