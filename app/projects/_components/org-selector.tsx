"use client";

import { NameDialog } from "@/app/projects/_components/studio-dialog";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuItem,
  StudioMenuLabel,
  StudioMenuRadioGroup,
  StudioMenuRadioItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import {
  useActiveOrganizationId,
  useCreateOrganization,
  useOrganizations,
  useSetActiveOrganization,
} from "@/lib/projects/hooks";
import type { OrganizationSummary } from "@/lib/projects/types";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function OrgAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#fd4f6a] via-[#a3407a] to-[#3d4bb8] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name[0] ?? "O").toUpperCase()}
    </span>
  );
}

export function OrgSelector({
  onActiveOrg,
}: {
  onActiveOrg: (org: OrganizationSummary | null) => void;
}) {
  const orgsQuery = useOrganizations();
  const activeQuery = useActiveOrganizationId();
  const setActive = useSetActiveOrganization();
  const createOrg = useCreateOrganization();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const orgs = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data]);
  const sessionOrgId = activeQuery.data ?? null;
  const [chosenId, setChosenId] = useState<string | null>(null);
  const activatedId = useRef<string | null>(null);

  const activeOrg = useMemo(() => {
    const preferred = chosenId ?? sessionOrgId;
    return orgs.find((o) => o.id === preferred) ?? orgs[0] ?? null;
  }, [orgs, chosenId, sessionOrgId]);

  useEffect(() => {
    onActiveOrg(activeOrg);
  }, [activeOrg, onActiveOrg]);

  // Activate once per organization. Repeating this while the session still
  // reports no active org refetches the page continuously.
  useEffect(() => {
    const id = activeOrg?.id;
    if (!id || sessionOrgId === id || activatedId.current === id) return;
    activatedId.current = id;
    setActive.mutate(id);
  }, [activeOrg?.id, sessionOrgId, setActive]);

  function selectOrg(id: string) {
    if (id === activeOrg?.id) return;
    activatedId.current = id;
    setChosenId(id);
    setActive.mutate(id);
  }

  function openCreate() {
    setCreateError(null);
    setCreateOpen(true);
  }

  async function onCreate(name: string) {
    setCreateError(null);
    try {
      await createOrg.mutateAsync(name);
      setCreateOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create organization");
    }
  }

  const createDialog = (
    <NameDialog
      open={createOpen}
      title="Create organization"
      description="Organizations own folders and projects. You can switch between them anytime."
      icon={<Building2 />}
      label="Organization name"
      placeholder="e.g. Acme Motion Labs"
      confirmLabel="Create organization"
      pending={createOrg.isPending}
      error={createError}
      onClose={() => setCreateOpen(false)}
      onSubmit={(name) => void onCreate(name)}
    />
  );

  if (orgsQuery.isLoading || activeQuery.isLoading) {
    return <div className="studio-skeleton h-[52px] w-full lg:w-72" />;
  }

  if (!orgs.length) {
    return (
      <>
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04] lg:w-auto"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(253,79,106,0.14)] text-[var(--studio-accent-2)]">
            <Plus className="h-5 w-5" />
          </span>
          <span>
            <span className="studio-heading block text-lg leading-tight">Create organization</span>
            <span className="text-xs font-semibold text-[var(--studio-muted)]">Your workspace for projects</span>
          </span>
        </button>
        {createDialog}
      </>
    );
  }

  return (
    <>
      <StudioMenu>
        <StudioMenuTrigger className="group flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] data-[state=open]:bg-white/[0.05] lg:w-auto lg:max-w-[340px]">
          <OrgAvatar name={activeOrg?.name ?? "O"} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="studio-heading truncate text-lg leading-tight">{activeOrg?.name}</span>
              <span className="shrink-0 rounded-[5px] bg-[rgba(253,79,106,0.16)] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--studio-accent-2)]">
                Workspace
              </span>
            </span>
            <span className="block truncate text-xs font-semibold text-[var(--studio-muted)]">
              {orgs.length > 1 ? `${orgs.length} organizations` : `@${activeOrg?.slug}`}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--studio-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </StudioMenuTrigger>
        <StudioMenuContent align="start" className="w-[min(320px,calc(100vw-24px))]">
          <StudioMenuLabel>Organizations</StudioMenuLabel>
          <StudioMenuRadioGroup
            value={activeOrg?.id}
            onValueChange={selectOrg}
          >
            {orgs.map((org) => (
              <StudioMenuRadioItem key={org.id} value={org.id} className="py-1.5">
                <OrgAvatar name={org.name} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{org.name}</span>
                  <span className="block truncate text-[11px] font-medium text-[var(--studio-muted)]">@{org.slug}</span>
                </span>
              </StudioMenuRadioItem>
            ))}
          </StudioMenuRadioGroup>
          <StudioMenuSeparator />
          <StudioMenuItem onSelect={openCreate}>
            <Plus />
            Create organization
          </StudioMenuItem>
        </StudioMenuContent>
      </StudioMenu>
      {createDialog}
    </>
  );
}
