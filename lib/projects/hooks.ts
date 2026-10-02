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
  createOrganization,
  getActiveMemberRole,
  getActiveOrganizationId,
  listOrganizations,
  setActiveOrganization,
} from "@/lib/projects/orgs";

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
  return useQuery({
    queryKey: orgKeys.all,
    queryFn: listOrganizations,
  });
}

export function useActiveOrganizationId() {
  return useQuery({
    queryKey: orgKeys.active,
    queryFn: getActiveOrganizationId,
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
  return useQuery({
    queryKey: folderKeys.all(organizationId ?? ""),
    queryFn: () => listFolders(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useProjects(
  organizationId: string | null | undefined,
  folderId?: string | null,
) {
  return useQuery({
    queryKey: projectKeys.all(organizationId ?? "", folderId),
    queryFn: () => listProjects(organizationId!, folderId),
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
    onSuccess: async () => {
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

export function useDeleteProject(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["projects", organizationId] });
    },
  });
}
