"use client";

import { authClient } from "@/lib/auth/client";
import type { OrganizationMember, OrganizationSummary } from "@/lib/projects/types";

function asOrgList(data: unknown): OrganizationSummary[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is OrganizationSummary =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as OrganizationSummary).id === "string" &&
      typeof (item as OrganizationSummary).name === "string",
  );
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const result = await authClient.organization.list();
  if (result.error) {
    throw new Error(result.error.message || "Failed to list organizations");
  }
  return asOrgList(result.data);
}

export async function setActiveOrganization(organizationId: string) {
  const result = await authClient.organization.setActive({
    organizationId,
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to set active organization");
  }
  return result.data;
}

export async function createOrganization(name: string) {
  const trimmed = name.trim();
  const slug =
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `org-${Date.now()}`;

  const result = await authClient.organization.create({
    name: trimmed,
    slug,
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to create organization");
  }
  const org = result.data as unknown as OrganizationSummary | null;
  if (org?.id) {
    await setActiveOrganization(org.id);
  }
  return org;
}

export async function updateOrganizationName({
  organizationId,
  name,
}: {
  organizationId: string;
  name: string;
}) {
  const result = await authClient.organization.update({
    organizationId,
    data: { name: name.trim() },
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to update organization");
  }
  return result.data as unknown as OrganizationSummary | null;
}

export async function listOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const result = await authClient.organization.listMembers({
    query: { organizationId },
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to list members");
  }
  return memberListFromUnknown(result.data).filter(
    (row): row is OrganizationMember =>
      typeof row.id === "string" && typeof row.userId === "string",
  );
}

export async function getActiveOrganizationId(): Promise<string | null> {
  const result = await authClient.getSession();
  if (result.error || !result.data) return null;
  const session = result.data.session as
    | { activeOrganizationId?: string | null }
    | undefined;
  return session?.activeOrganizationId ?? null;
}

export async function getActiveMemberRole(
  organizationId?: string | null,
): Promise<string | null> {
  const active = await authClient.organization.getActiveMemberRole();
  const fromActive = roleFromUnknown(active.data);
  if (fromActive) return fromActive;

  if (!organizationId) return null;
  const [session, members] = await Promise.all([
    authClient.getSession(),
    authClient.organization.listMembers({
      query: { organizationId },
    }),
  ]);
  if (members.error) return null;
  const userId = session.data?.user?.id;
  const list = memberListFromUnknown(members.data);
  const me = list.find((row) => row.userId === userId);
  return me?.role ?? null;
}

function roleFromUnknown(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object" && "role" in data) {
    const role = (data as { role?: unknown }).role;
    return typeof role === "string" && role.trim() ? role : null;
  }
  return null;
}

function memberListFromUnknown(data: unknown): Partial<OrganizationMember>[] {
  if (Array.isArray(data)) return data as Partial<OrganizationMember>[];
  if (data && typeof data === "object" && "members" in data) {
    const members = (data as { members?: unknown }).members;
    return Array.isArray(members) ? (members as Partial<OrganizationMember>[]) : [];
  }
  return [];
}
