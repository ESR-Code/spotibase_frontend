"use client";

import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import { authClient } from "@/lib/auth/client";
import { Bell, ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BrandMark() {
  return (
    <Link href="/projects" className="flex items-center gap-2.5" aria-label="VectorForge home">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#ff7186] via-[#fd4f6a] to-[#b8253f] shadow-[0_6px_18px_-6px_rgba(253,79,106,0.8)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M4 5l8 14 8-14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="1.8" fill="#fff" />
        </svg>
      </span>
      <span className="studio-heading text-xl leading-none">VectorForge</span>
    </Link>
  );
}

export function ProjectsTopbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string | null; email?: string | null } | null>(null);

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
    <header className="sticky top-0 z-40 border-b border-[var(--studio-line)] bg-[rgba(9,15,31,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <BrandMark />

        <div className="flex items-center gap-1">
          <button type="button" className="studio-icon-btn" aria-label="Notifications" title="Notifications (coming soon)">
            <Bell />
          </button>
          <button type="button" className="studio-icon-btn" aria-label="Settings" title="Settings (coming soon)">
            <Settings />
          </button>

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
        </div>
      </div>
    </header>
  );
}
