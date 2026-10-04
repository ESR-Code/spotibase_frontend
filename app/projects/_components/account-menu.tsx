"use client";

import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import { authClient } from "@/lib/auth/client";
import {
  useActiveMemberRole,
  useActiveOrganizationId,
  useOrganizations,
} from "@/lib/projects/hooks";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string | null; email?: string | null } | null>(null);
  const orgsQuery = useOrganizations();
  const activeQuery = useActiveOrganizationId();
  const orgId = activeQuery.data ?? orgsQuery.data?.[0]?.id ?? null;
  const roleQuery = useActiveMemberRole(orgId);
  const roleLabel = useMemo(() => {
    const role = roleQuery.data?.trim();
    return role ? formatRole(role) : null;
  }, [roleQuery.data]);

  useEffect(() => {
    let cancelled = false;
    authClient.getSession().then((result) => {
      if (!cancelled) setUser(result.data?.user ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = user?.name || user?.email || "";
  const initials =
    label
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

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
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#fd4f6a] to-[#4c3ba8] text-[11px] font-extrabold text-white ring-2 ring-[var(--studio-bar)]">
          {initials}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--studio-muted)]" />
      </StudioMenuTrigger>
      <StudioMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fd4f6a] to-[#4c3ba8] text-xs font-extrabold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--studio-fg)]">{user?.name || "Signed in"}</p>
            {user?.email ? (
              <p className="truncate text-xs text-[var(--studio-muted)]">{user.email}</p>
            ) : null}
            {roleLabel ? (
              <span className="mt-1.5 inline-flex rounded-md bg-[rgba(253,79,106,0.16)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--studio-accent-2)]">
                {roleLabel}
              </span>
            ) : null}
          </div>
        </div>
        <StudioMenuSeparator />
        <StudioMenuItem disabled>
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
