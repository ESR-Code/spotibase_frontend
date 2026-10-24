"use client";

import { Avatar, initialsOf } from "@/app/projects/_components/avatar";
import { RoleBadge } from "@/app/projects/_components/role-badge";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import { authClient } from "@/lib/auth/client";
import { useCurrentAccount } from "@/lib/auth/hooks";
import {
  useActiveMemberRole,
  useActiveOrganizationId,
  useOrganizations,
} from "@/lib/projects/hooks";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export function AccountMenu() {
  const router = useRouter();
  const user = useCurrentAccount().data?.user ?? null;
  const orgsQuery = useOrganizations();
  const activeQuery = useActiveOrganizationId();
  const orgId = activeQuery.data ?? orgsQuery.data?.[0]?.id ?? null;
  const roleQuery = useActiveMemberRole(orgId);
  const role = roleQuery.data?.trim() || null;

  const label = user?.name || user?.email || "";
  const initials = initialsOf(label);

  async function onSignOut() {
    await authClient.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <StudioMenu>
      <StudioMenuTrigger
        className="ml-1 flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] data-[state=open]:bg-white/5"
        aria-label="Account menu"
      >
        <Avatar name={label || "U"} initials={initials} size={32} className="ring-2 ring-[var(--studio-bar)]" />
        <ChevronDown className="h-3.5 w-3.5 text-[var(--studio-muted)]" />
      </StudioMenuTrigger>
      <StudioMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar name={label || "U"} initials={initials} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--studio-fg)]">{user?.name || "Signed in"}</p>
            {user?.email ? (
              <p className="truncate text-xs text-[var(--studio-muted)]">{user.email}</p>
            ) : null}
            {role ? <RoleBadge role={role} className="mt-1.5" /> : null}
          </div>
        </div>
        <StudioMenuSeparator />
        <StudioMenuItem onSelect={() => router.push("/settings/account/profile")}>
          <Settings />
          Account settings
        </StudioMenuItem>
        <StudioMenuItem danger onSelect={() => void onSignOut()}>
          <LogOut />
          Sign out
        </StudioMenuItem>
      </StudioMenuContent>
    </StudioMenu>
  );
}
