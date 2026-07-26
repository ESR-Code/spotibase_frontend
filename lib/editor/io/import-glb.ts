import { toast } from "sonner";

export async function importGlbFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "glb") {
    toast.error("Unsupported format. Use .glb");
    return;
  }

  window.dispatchEvent(
    new CustomEvent("editor:import-glb", { detail: { file } }),
  );
}
