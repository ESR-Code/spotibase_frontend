import { serializeProject } from "@/lib/editor/persist/serialize";

/**
 * Download the live (possibly unsaved) project as JSON, the same payload
 * Save sends. A last resort when the editor cannot save (conflict, crash).
 */
export function downloadProjectBackup(projectId: string | null): boolean {
  try {
    const json = JSON.stringify(serializeProject(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `spotibase-backup-${projectId ?? "project"}-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
