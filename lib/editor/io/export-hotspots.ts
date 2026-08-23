import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import { DEFAULT_MODEL_NAME, PROJECT_NAME } from "@/lib/editor/theme/tokens";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

export function exportHotspots() {
  const { hotspots } = useEditorStore.getState();
  const { modelName } = useModelStore.getState();
  const { legendCategories } = useSettingsStore.getState();
  const categoryById = new Map(legendCategories.map((c) => [c.id, c]));

  const data = {
    project: PROJECT_NAME,
    model: modelName || DEFAULT_MODEL_NAME,
    exportedAt: new Date().toISOString(),
    legendCategories,
    hotspots: hotspots.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.desc,
      image: h.image,
      link: h.link,
      type: h.type,
      color: h.color,
      style: h.style,
      shape: h.shape ?? "circle",
      number: h.number,
      icon: h.icon,
      markerImage: h.markerImage || "",
      pulse: h.pulse,
      wick: h.wick ?? false,
      enabled: h.enabled ?? true,
      category: h.category || "",
      categoryName: categoryById.get(h.category)?.name ?? "",
      legendName: h.legendName || h.title,
      blocks: h.blocks,
      actions: getActionGraph(h),
      position: {
        x: +h.position.x.toFixed(3),
        y: +h.position.y.toFixed(3),
        z: +h.position.z.toFixed(3),
      },
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "hotspots-export.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
