import { DataApiError, dataJson } from "@/lib/api/data";
import { collectOrphanAssets, listProjectAssets } from "@/lib/editor/assets/api";
import type { EditorAsset } from "@/lib/editor/assets/types";
import {
  sceneRowSchema,
  type ProjectEditorData,
  type SceneRow,
  type SceneRowPayload,
} from "@/lib/editor/persist/schema";

export type EditorProjectRecord = {
  id: string;
  organization_id: string;
  name: string;
  editor_data: unknown;
  editor_revision: number;
};

export type LoadedEditorProject = {
  project: EditorProjectRecord;
  sceneRows: SceneRow[];
  assets: EditorAsset[];
};

export class ProjectConflictError extends Error {
  constructor() {
    super("This project was saved somewhere else. Reload to get the latest version.");
    this.name = "ProjectConflictError";
  }
}

export async function loadEditorProject(projectId: string): Promise<LoadedEditorProject | null> {
  const projectQuery = new URLSearchParams({
    id: `eq.${projectId}`,
    select: "id,organization_id,name,editor_data,editor_revision",
    limit: "1",
  });
  const sceneQuery = new URLSearchParams({
    project_id: `eq.${projectId}`,
    select: "id,name,slug,sort_order,type,thumbnail_asset_id,data",
    order: "sort_order.asc",
  });
  const [projects, rawScenes] = await Promise.all([
    dataJson<EditorProjectRecord[]>(`projects?${projectQuery}`),
    dataJson<unknown[]>(`scenes?${sceneQuery}`),
  ]);
  const project = projects[0];
  if (!project) return null;
  // Sweep before the library query so an abandoned upload is not shown.
  await collectOrphanAssets(projectId);
  const assets = await listProjectAssets(projectId);
  const sceneRows = rawScenes.map((row) => sceneRowSchema.parse(row));
  return { project, sceneRows, assets };
}

/** Atomic save via `public.save_editor_project`; returns the new revision. */
export async function saveEditorProject(input: {
  projectId: string;
  expectedRevision: number;
  editorData: ProjectEditorData;
  scenes: SceneRowPayload[];
}): Promise<number> {
  try {
    const revision = await dataJson<number>("rpc/save_editor_project", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        p_project_id: input.projectId,
        p_expected_revision: input.expectedRevision,
        p_editor_data: input.editorData,
        p_scenes: input.scenes,
      }),
    });
    return typeof revision === "number" ? revision : input.expectedRevision + 1;
  } catch (error) {
    if (
      error instanceof DataApiError &&
      (error.status === 409 ||
        /saved somewhere else|revision_conflict/i.test(error.message))
    ) {
      throw new ProjectConflictError();
    }
    throw error;
  }
}
