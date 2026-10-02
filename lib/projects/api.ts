import { dataJson } from "@/lib/api/data";
import type { FolderColor } from "@/lib/projects/folder-colors";
import type { ProjectFolderRow, ProjectRow } from "@/lib/projects/types";

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
  const rows = await dataJson<ProjectFolderRow[]>("project_folders", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      name: input.name.trim(),
      color: input.color,
    }),
  });
  return rows[0];
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

  const rows = await dataJson<ProjectFolderRow[]>(
    `project_folders?id=eq.${encode(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return rows[0];
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
    select: "*",
  });
  if (folderId === null) {
    q.set("folder_id", "is.null");
  } else if (folderId) {
    q.set("folder_id", `eq.${folderId}`);
  }
  return dataJson<ProjectRow[]>(`projects?${q}`);
}

export async function createProject(input: {
  organizationId: string;
  name: string;
  description?: string;
  folderId?: string | null;
}) {
  const rows = await dataJson<ProjectRow[]>("projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      folder_id: input.folderId ?? null,
      scene_count: 0,
    }),
  });
  return rows[0];
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

  const rows = await dataJson<ProjectRow[]>(`projects?id=eq.${encode(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return rows[0];
}

export async function deleteProject(id: string) {
  await dataJson<undefined>(`projects?id=eq.${encode(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
