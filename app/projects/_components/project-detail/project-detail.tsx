"use client";

import { ProjectBreadcrumb, ProjectHero } from "@/app/projects/_components/project-detail/project-hero";
import {
  DEFAULT_PROJECT_TAB,
  isProjectTab,
  PROJECT_TABS,
} from "@/app/projects/_components/project-detail/project-tabs";
import type { ProjectTabId } from "@/app/projects/_components/project-detail/types";
import { ProjectsFooter } from "@/app/projects/_components/projects-footer";
import { ProjectsTopbar } from "@/app/projects/_components/projects-topbar";
import { StudioLineTabs, StudioTabPanel } from "@/app/projects/_components/studio-line-tabs";
import { useFolders, useOrganizations, useProject } from "@/lib/projects/hooks";
import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const TABS_ID = "project-detail";

function useProjectTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab = isProjectTab(raw) ? raw : DEFAULT_PROJECT_TAB;

  const setTab = useCallback(
    (next: ProjectTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_PROJECT_TAB) params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return [tab, setTab] as const;
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useProjectTab();
  const projectQuery = useProject(id);
  const project = projectQuery.data ?? null;
  const foldersQuery = useFolders(project?.organization_id);
  const orgsQuery = useOrganizations();

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const folder = folders.find((f) => f.id === project?.folder_id) ?? null;
  const organization = orgsQuery.data?.find((o) => o.id === project?.organization_id) ?? null;
  const active = PROJECT_TABS.find((t) => t.id === tab) ?? PROJECT_TABS[0];

  return (
    <div className="flex flex-1 flex-col">
      <ProjectsTopbar />

      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {projectQuery.isLoading ? (
          <ProjectDetailSkeleton />
        ) : !project ? (
          <ProjectMissing error={projectQuery.error} />
        ) : (
          <>
            <ProjectBreadcrumb project={project} folder={folder} organization={organization} />
            <ProjectHero project={project} folder={folder} organization={organization} />
            <div className="studio-enter flex flex-col gap-6" style={{ animationDelay: "80ms" }}>
              <StudioLineTabs tabs={PROJECT_TABS} value={tab} onChange={setTab} label="Project sections" idPrefix={TABS_ID} />
              <StudioTabPanel key={active.id} idPrefix={TABS_ID} id={active.id}>
                <active.Panel
                  project={project}
                  folder={folder}
                  folders={folders}
                  organization={organization}
                  onTabChange={setTab}
                />
              </StudioTabPanel>
            </div>
          </>
        )}
      </main>

      <ProjectsFooter />
    </div>
  );
}

function ProjectMissing({ error }: { error: unknown }) {
  return (
    <div className="studio-panel studio-enter my-auto flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="studio-dialog-icon h-14 w-14 rounded-2xl">
        <SearchX />
      </span>
      <div>
        <h1 className="studio-heading text-2xl">{error ? "Couldn’t load project" : "Project not found"}</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--studio-muted)]">
          {error instanceof Error && error.message
            ? error.message
            : "It may have been deleted, or you don’t have access to its organization."}
        </p>
      </div>
      <Link href="/projects" className="studio-btn studio-btn-primary">
        <ArrowLeft />
        Back to projects
      </Link>
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading project">
      <div className="studio-skeleton h-8 w-72" />
      <div className="studio-skeleton h-[220px] lg:h-[214px]" />
      <div className="studio-skeleton h-11 w-full max-w-md" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="studio-skeleton h-[360px] lg:col-span-2" />
        <div className="studio-skeleton h-[360px]" />
      </div>
    </div>
  );
}
