import { DataApiError, dataJson } from "@/lib/api/data";
import { ProjectConflictError } from "@/lib/editor/persist/api";

export type PublishVersionStatus = "published" | "archived";

export type PublishVersion = {
  id: string;
  version: number;
  status: PublishVersionStatus;
  created_by: string | null;
  created_at: string;
  /** `projects.editor_revision` the snapshot was built from. */
  editorRevision: number | null;
};

export type PublishState = {
  passwordProtected: boolean;
  /** Newest first; the database keeps at most 5. */
  versions: PublishVersion[];
};

/** Reads only: `project_versions` is SELECT-only for the Data API. */
export async function loadPublishState(projectId: string): Promise<PublishState> {
  const projectQuery = new URLSearchParams({
    id: `eq.${projectId}`,
    select: "publish_password_protected",
    limit: "1",
  });
  const versionQuery = new URLSearchParams({
    project_id: `eq.${projectId}`,
    select: "id,version,status,created_by,created_at,editorRevision:snapshot->editorRevision",
    order: "version.desc",
  });
  const [projects, versions] = await Promise.all([
    dataJson<{ publish_password_protected: boolean }[]>(`projects?${projectQuery}`),
    dataJson<PublishVersion[]>(`project_versions?${versionQuery}`),
  ]);
  return {
    passwordProtected: projects[0]?.publish_password_protected ?? false,
    versions,
  };
}

function rpc<T>(name: string, body: Record<string, unknown>) {
  return dataJson<T>(`rpc/${name}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
}

/** Publishes the saved draft at `expectedRevision` as a new live version. */
export async function publishProject(input: {
  projectId: string;
  expectedRevision: number;
}): Promise<{ id: string; version: number; created_at: string }> {
  try {
    return await rpc("publish_project_version", {
      p_project_id: input.projectId,
      p_expected_revision: input.expectedRevision,
    });
  } catch (error) {
    if (
      error instanceof DataApiError &&
      (error.status === 409 || /saved somewhere else|revision_conflict/i.test(error.message))
    ) {
      throw new ProjectConflictError();
    }
    throw error;
  }
}

export async function unpublishProject(projectId: string): Promise<void> {
  await rpc<unknown>("unpublish_project", { p_project_id: projectId });
}

/** `null` removes password protection. The password is never read back. */
export async function setPublishPassword(
  projectId: string,
  password: string | null,
): Promise<void> {
  await rpc<unknown>("set_project_publish_password", {
    p_project_id: projectId,
    p_password: password,
  });
}
