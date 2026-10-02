"use client";

import { authClient } from "@/lib/auth/client";
import type { OrganizationSummary } from "@/lib/projects/types";

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

export async function getActiveOrganizationId(): Promise<string | null> {
  const result = await authClient.getSession();
  if (result.error || !result.data) return null;
  const session = result.data.session as
    | { activeOrganizationId?: string | null }
    | undefined;
  return session?.activeOrganizationId ?? null;
}
