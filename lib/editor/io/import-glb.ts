import { toast } from "sonner";
import { useSceneStore } from "@/lib/editor/state/scene-store";

export async function importGlbFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "glb") {
    toast.error("Unsupported format. Use .glb");
    return;
  }

  toast.message(`Importing ${file.name}...`);
  useSceneStore.getState().setModelMeta(file.name, "Pending engine load");

  // Phase 2: wire to PlayCanvas model-manager
  window.dispatchEvent(
    new CustomEvent("editor:import-glb", { detail: { file } }),
  );
}
