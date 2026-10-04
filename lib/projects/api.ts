import { dataJson } from "@/lib/api/data";
import type { FolderColor } from "@/lib/projects/folder-colors";
import type {
  ProjectAssetStats,
  ProjectFolderRow,
  ProjectRow,
} from "@/lib/projects/types";

/** Excludes `editor_data`, which only the editor loads. */
const PROJECT_COLUMNS =
  "id,organization_id,folder_id,name,description,scene_count,thumbnail_r2_key,editor_revision,created_at,updated_at";

function encode(value: string) {
  return encodeURIComponent(value);
}

export async function listFolders(organizationId: string) {
  const q = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    order: "updated_at.desc",
    select: "*",
  });
  return dataJson<ProjectFolderRow[]>(`project_folders?${q}`);
}

export async function createFolder(input: {
  organizationId: string;
  name: string;
  color: FolderColor;
}) {
  const rows = await dataJson<ProjectFolderRow[] | undefined>("project_folders", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      name: input.name.trim(),
      color: input.color,
    }),
  });
  return rows?.[0];
}

export async function updateFolder(
  id: string,
  patch: { name?: string; color?: FolderColor },
) {
  const body: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.color !== undefined) body.color = patch.color;

  const rows = await dataJson<ProjectFolderRow[] | undefined>(
    `project_folders?id=eq.${encode(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return rows?.[0];
}

export async function deleteFolder(id: string) {
  await dataJson<undefined>(`project_folders?id=eq.${encode(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function listProjects(
  organizationId: string,
  folderId?: string | null,
) {
  const q = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    order: "updated_at.desc",
    select: PROJECT_COLUMNS,
  });
  if (folderId === null) {
    q.set("folder_id", "is.null");
  } else if (folderId) {
    q.set("folder_id", `eq.${folderId}`);
  }
  return dataJson<ProjectRow[]>(`projects?${q}`);
}

export async function getProject(id: string) {
  const q = new URLSearchParams({
    id: `eq.${id}`,
    select: PROJECT_COLUMNS,
    limit: "1",
  });
  const rows = await dataJson<ProjectRow[]>(`projects?${q}`);
  return rows[0] ?? null;
}

export async function createProject(input: {
  organizationId: string;
  name: string;
  description?: string;
  folderId?: string | null;
}) {
  const rows = await dataJson<ProjectRow[] | undefined>("projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      folder_id: input.folderId ?? null,
    }),
  });
  return rows?.[0];
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    folderId?: string | null;
  },
) {
  const body: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.description !== undefined) {
    body.description = patch.description?.trim() || null;
  }
  if (patch.folderId !== undefined) body.folder_id = patch.folderId;

  const rows = await dataJson<ProjectRow[] | undefined>(`projects?id=eq.${encode(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return rows?.[0];
}

export async function deleteProject(id: string) {
  await dataJson<undefined>(`projects?id=eq.${encode(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

function asCount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseAssetStats(raw: unknown): ProjectAssetStats {
  const value = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
  const row = (Array.isArray(value) ? value[0] : value) as Partial<ProjectAssetStats> | null;
  return {
    total_bytes: asCount(row?.total_bytes),
    image_count: asCount(row?.image_count),
    model_count: asCount(row?.model_count),
    other_count: asCount(row?.other_count),
  };
}

/** Ready-file kind counts + total bytes. Does not load asset rows. */
export async function getProjectAssetStats(projectId: string): Promise<ProjectAssetStats> {
  const raw = await dataJson<unknown>("rpc/project_asset_stats", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ p_project_id: projectId }),
  });
  return parseAssetStats(raw);
}
