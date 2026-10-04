"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createFolder,
  createProject,
  deleteFolder,
  deleteProject,
  getProject,
  listFolders,
  listProjects,
  updateFolder,
  updateProject,
} from "@/lib/projects/api";
import type { FolderColor } from "@/lib/projects/folder-colors";
import {
  removeProjectThumbnail,
  uploadProjectThumbnail,
} from "@/lib/projects/storage";
import {
  createOrganization,
  getActiveMemberRole,
  getActiveOrganizationId,
  listOrganizations,
  setActiveOrganization,
} from "@/lib/projects/orgs";
import type {
  OrganizationSummary,
  ProjectFolderRow,
  ProjectRow,
} from "@/lib/projects/types";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const orgKeys = {
  all: ["organizations"] as const,
  active: ["active-organization"] as const,
  role: (orgId: string | null) => ["organization-role", orgId] as const,
};

export const folderKeys = {
  all: (orgId: string) => ["folders", orgId] as const,
};

export const projectKeys = {
  all: (orgId: string, folderId?: string | null) =>
    ["projects", orgId, folderId ?? "all"] as const,
  detail: (id: string) => ["project", id] as const,
};

export function useOrganizations() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: orgKeys.all,
    queryFn: async () => {
      const orgs = await listOrganizations();
      if (orgs.length > 0) return orgs;
      const previous = qc.getQueryData<OrganizationSummary[]>(orgKeys.all);
      if (!previous?.length) return orgs;
      await wait(400);
      const retry = await listOrganizations();
      return retry.length > 0 ? retry : previous;
    },
  });
}

export function useActiveOrganizationId() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: orgKeys.active,
    queryFn: async () => {
      const id = await getActiveOrganizationId();
      if (id) return id;
      await wait(400);
      const retry = await getActiveOrganizationId();
      if (retry) return retry;
      // getSession() sometimes comes back empty after a tab switch. Keep the
      // org we already activated instead of clearing the workspace.
      return qc.getQueryData<string | null>(orgKeys.active) ?? null;
    },
  });
}

export function useActiveMemberRole(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: orgKeys.role(organizationId ?? null),
    queryFn: () => getActiveMemberRole(organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useSetActiveOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setActiveOrganization,
    onSuccess: (_data, organizationId) => {
      // Trust the id we just activated. Refetching the session here comes back
      // empty and would retrigger activation in a loop.
      qc.setQueryData(orgKeys.active, organizationId);
      void qc.invalidateQueries({ queryKey: orgKeys.role(organizationId) });
    },
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrganization,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: orgKeys.all });
      await qc.invalidateQueries({ queryKey: orgKeys.active });
    },
  });
}

export function useFolders(organizationId: string | null | undefined) {
  const qc = useQueryClient();
  const key = folderKeys.all(organizationId ?? "");
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const rows = await listFolders(organizationId!);
      if (rows.length > 0) return rows;
      return qc.getQueryData<ProjectFolderRow[]>(key) ?? rows;
    },
    enabled: Boolean(organizationId),
  });
}

export function useProjects(
  organizationId: string | null | undefined,
  folderId?: string | null,
) {
  const qc = useQueryClient();
  const key = projectKeys.all(organizationId ?? "", folderId);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const rows = await listProjects(organizationId!, folderId);
      if (rows.length > 0) return rows;
      return qc.getQueryData<ProjectRow[]>(key) ?? rows;
    },
    enabled: Boolean(organizationId),
  });
}

export function useProject(id: string | null | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? ""),
    queryFn: () => getProject(id!),
    enabled: Boolean(id),
  });
}

export function useCreateFolder(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color: FolderColor }) =>
      createFolder({ organizationId, ...input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: folderKeys.all(organizationId) });
    },
  });
}

export function useUpdateFolder(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      color?: FolderColor;
    }) => updateFolder(input.id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: folderKeys.all(organizationId) });
    },
  });
}

export function useDeleteFolder(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: async (_data, id) => {
      qc.setQueryData(
        folderKeys.all(organizationId),
        (old: ProjectFolderRow[] | undefined) => old?.filter((row) => row.id !== id) ?? old,
      );
      await qc.invalidateQueries({ queryKey: folderKeys.all(organizationId) });
      await qc.invalidateQueries({ queryKey: ["projects", organizationId] });
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      name: string;
      description?: string;
      folderId?: string | null;
    }) => createProject(input),
    onSuccess: async (_data, input) => {
      await qc.invalidateQueries({ queryKey: ["projects", input.organizationId] });
      await qc.invalidateQueries({ queryKey: folderKeys.all(input.organizationId) });
    },
  });
}

export function useUpdateProject(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      description?: string | null;
      folderId?: string | null;
    }) => updateProject(input.id, input),
    onSuccess: async (_data, input) => {
      await qc.invalidateQueries({ queryKey: ["projects", organizationId] });
      await qc.invalidateQueries({ queryKey: projectKeys.detail(input.id) });
    },
  });
}

export function useUploadProjectThumbnail(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; file: File }) =>
      uploadProjectThumbnail(input.id, input.file),
    onSuccess: async (_data, input) => {
      await qc.invalidateQueries({ queryKey: ["projects", organizationId] });
      await qc.invalidateQueries({ queryKey: projectKeys.detail(input.id) });
    },
  });
}

export function useRemoveProjectThumbnail(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeProjectThumbnail,
    onSuccess: async (_data, id) => {
      await qc.invalidateQueries({ queryKey: ["projects", organizationId] });
      await qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useDeleteProject(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Best-effort: once the row is gone, RLS can no longer authorize the delete.
      await removeProjectThumbnail(id).catch(() => undefined);
      await deleteProject(id);
    },
    onSuccess: async (_data, id) => {
      qc.setQueriesData<ProjectRow[]>(
        { queryKey: ["projects", organizationId] },
        (old) => old?.filter((row) => row.id !== id) ?? old,
      );
      await qc.invalidateQueries({ queryKey: ["projects", organizationId] });
    },
  });
}
