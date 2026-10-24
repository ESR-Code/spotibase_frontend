"use client";

import { useActiveOrganizationId, useOrganizations } from "@/lib/projects/hooks";

/** The organization the settings pages act on: the session's active org, else the first one. */
export function useSettingsOrg() {
  const orgsQuery = useOrganizations();
  const activeQuery = useActiveOrganizationId();
  const orgs = orgsQuery.data ?? [];
  const orgId = activeQuery.data ?? orgs[0]?.id ?? null;
  const org = orgs.find((o) => o.id === orgId) ?? orgs[0] ?? null;
  return { org, orgsQuery, loading: orgsQuery.isLoading || activeQuery.isLoading };
}
