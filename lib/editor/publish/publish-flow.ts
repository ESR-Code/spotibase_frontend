import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import { ProjectConflictError } from "@/lib/editor/persist/api";
import { saveProject, useProjectPersistStore } from "@/lib/editor/persist/persist-store";
import { publishProject } from "@/lib/editor/publish/api";
import { toast } from "@/lib/editor/toast";

/**
 * Saves first when the draft is dirty, then publishes the saved revision.
 * Returns the new version number, or null when nothing was published
 * (the reason is already toasted).
 */
export async function publishCurrentProject(): Promise<number | null> {
  const initial = useProjectPersistStore.getState();
  if (!initial.projectId) return null;

  if (useAssetsStore.getState().pendingUploads > 0) {
    toast.message("Uploads are still running", {
      description: "Publish again once they finish.",
    });
    return null;
  }

  if (initial.dirty && !(await saveProject())) return null;

  const { projectId, revision } = useProjectPersistStore.getState();
  if (!projectId) return null;
  try {
    const published = await publishProject({ projectId, expectedRevision: revision });
    toast.success(`Published version ${published.version}`);
    return published.version;
  } catch (error) {
    if (error instanceof ProjectConflictError) {
      useProjectPersistStore.setState({ status: "conflict", error: error.message });
      toast.error("Not published: this project changed elsewhere", {
        description: "Reload the editor to get the latest version.",
      });
      return null;
    }
    toast.error("Could not publish the project", {
      description: error instanceof Error ? error.message : undefined,
    });
    return null;
  }
}
