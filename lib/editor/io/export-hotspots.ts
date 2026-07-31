import { DEFAULT_MODEL_NAME } from "@/lib/editor/theme/tokens";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSceneStore } from "@/lib/editor/state/scene-store";

export function exportHotspots() {
  const { hotspots } = useEditorStore.getState();
  const { modelName } = useSceneStore.getState();

  const data = {
    project: "Factory Tour — Assembly Line B",
    model: modelName || DEFAULT_MODEL_NAME,
    exportedAt: new Date().toISOString(),
    hotspots: hotspots.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.desc,
      image: h.image,
      link: h.link,
      type: h.type,
      color: h.color,
      style: h.style,
      number: h.number,
      icon: h.icon,
      markerImage: h.markerImage || "",
      pulse: h.pulse,
      blocks: h.blocks,
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
