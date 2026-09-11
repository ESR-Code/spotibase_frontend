import {
  getOwnedActionGraph,
  LEGEND_OWNER_ID,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import { chainFrom } from "@/lib/editor/actions/graph-ops";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  legendCategoryHandleId,
  TRIGGER_NODE_ID,
} from "@/lib/editor/types/hotspot-action";

/** Run the Legend trigger chain for the selected Preview category. */
export async function runLegendCategoryActions(
  categoryId: string,
): Promise<void> {
  if (!useEditorStore.getState().isPreview) return;
  if (!useSettingsStore.getState().legendEnabled) return;

  const { runActionNodeList } = await import(
    "@/lib/editor/actions/run-action-graph"
  );

  const graph = getOwnedActionGraph(LEGEND_OWNER_ID);
  if (!graph) return;
  const tail = chainFrom(
    graph,
    TRIGGER_NODE_ID,
    legendCategoryHandleId(categoryId),
  );
  if (tail.length === 0) return;
  await runActionNodeList(tail, {
    hotspotId: null,
    ownerId: LEGEND_OWNER_ID,
    ownerKey: ownerKeyFor(LEGEND_OWNER_ID),
  });
}

/** Set the Preview legend filter and run the matching Legend trigger chain. */
export function selectLegendFilterCategory(categoryId: string): void {
  const prev = useUIStore.getState().legendFilterCategory;
  useUIStore.getState().setLegendFilterCategory(categoryId);
  if (prev === categoryId) return;
  void runLegendCategoryActions(categoryId);
}
