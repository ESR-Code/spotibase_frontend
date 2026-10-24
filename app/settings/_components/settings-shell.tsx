"use client";

import { OrgAvatar } from "@/app/projects/_components/org-selector";
import { PanelHeader } from "@/app/projects/_components/panel-header";
import { ProjectsFooter } from "@/app/projects/_components/projects-footer";
import { ProjectsTopbar } from "@/app/projects/_components/projects-topbar";
import type { AccountSection, OrganizationSection } from "@/app/settings/_components/settings-sections";
import { useSettingsOrg } from "@/app/settings/_components/use-settings-org";
import { organizationLogoSrc } from "@/lib/projects/storage";
import { cn } from "@/lib/utils";
import { ArrowLeft, Building2, CircleUser, KeyRound, ShieldCheck, Users, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type SettingsArea = "organization" | "account";

type NavItem = { id: OrganizationSection | AccountSection; label: string; icon: ReactNode; soon?: boolean };

const NAV: { area: SettingsArea; label: string; href: string; items: NavItem[] }[] = [
  {
    area: "organization",
    label: "Organization",
    href: "/settings/organization",
    items: [
      { id: "general", label: "General", icon: <Building2 /> },
      { id: "members", label: "Members", icon: <Users /> },
      { id: "api-secrets", label: "API secrets", icon: <KeyRound />, soon: true },
    ],
  },
  {
    area: "account",
    label: "Account",
    href: "/settings/account",
    items: [
      { id: "profile", label: "Profile", icon: <UserRound /> },
      { id: "security", label: "Security", icon: <ShieldCheck /> },
    ],
  },
];

function OrgHeader() {
  const { org, loading } = useSettingsOrg();
  if (loading) return <div className="studio-skeleton mx-3 mb-1 hidden h-10 lg:block" />;
  if (!org) return null;
  return (
    <div className="mx-3 mb-1 hidden items-center gap-2.5 lg:flex">
      <OrgAvatar name={org.name} logo={organizationLogoSrc(org)} size={32} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold text-[var(--studio-fg)]">{org.name}</span>
        <span className="block truncate text-xs font-semibold text-[var(--studio-muted)]">@{org.slug}</span>
      </span>
    </div>
  );
}

function SettingsNav({ area, section }: { area: SettingsArea; section: string }) {
  return (
    <nav aria-label="Settings" className="lg:sticky lg:top-24">
      {/* Mobile: one scrollable row of pills. Desktop: grouped vertical list. */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-5 lg:overflow-visible lg:p-0">
        {NAV.map((group) => (
          <div key={group.area} className="flex shrink-0 gap-1 lg:flex-col">
            <p className="studio-eyebrow hidden px-3 pb-1 lg:block">{group.label}</p>
            {group.area === "organization" ? <OrgHeader /> : null}
            {group.items.map((item) => {
              const current = group.area === area && item.id === section;
              return (
                <Link
                  key={item.id}
                  href={`${group.href}/${item.id}`}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-colors [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
                    current
                      ? "bg-white/[0.07] text-[var(--studio-fg)]"
                      : "text-[var(--studio-muted)] hover:bg-white/[0.04] hover:text-[var(--studio-fg-2)]",
                  )}
                >
                  <span className={current ? "text-[var(--studio-accent-2)]" : undefined}>{item.icon}</span>
                  <span className="lg:flex-1">{item.label}</span>
                  {item.soon ? <span className="studio-pill text-[10px]">Soon</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

export function SettingsShell({
  area,
  section,
  title,
  description,
  children,
}: {
  area: SettingsArea;
  section: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <ProjectsTopbar />
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="studio-enter flex flex-col gap-3">
          <Link href="/projects" className="studio-btn studio-btn-ghost w-fit">
            <ArrowLeft />
            Back to projects
          </Link>
          <div>
            <h1 className="studio-heading text-2xl leading-tight sm:text-3xl">{title}</h1>
            <p className="mt-1.5 text-sm font-semibold text-[var(--studio-muted)]">{description}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          <SettingsNav area={area} section={section} />
          <div className="studio-enter flex min-w-0 flex-col gap-5" style={{ animationDelay: "60ms" }}>
            {children}
          </div>
        </div>
      </main>
      <ProjectsFooter />
    </div>
  );
}

export function SettingsSection({
  id,
  title,
  subtitle,
  aside,
  children,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="studio-panel scroll-mt-24 p-5 sm:p-6">
      <PanelHeader title={title} subtitle={subtitle} aside={aside} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SettingsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="studio-skeleton h-11 w-full" />
      ))}
    </div>
  );
}

export function SettingsError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[10px] border border-[var(--studio-line-strong)] bg-[var(--studio-sub)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="studio-form-error m-0">{message}</p>
      {onRetry ? (
        <button type="button" className="studio-btn studio-btn-ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function SettingsEmpty({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-[var(--studio-line-strong)] px-4 py-8 text-center text-sm font-semibold text-[var(--studio-muted)] [&_svg]:h-6 [&_svg]:w-6">
      {icon ?? <CircleUser />}
      {children}
    </div>
  );
}

export function SavedNote({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--studio-teal)] sm:mr-auto">
      {children}
    </span>
  );
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
