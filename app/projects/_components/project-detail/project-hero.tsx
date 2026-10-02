import { EditorLaunchButton } from "@/app/projects/_components/editor-launch-button";
import { FolderIcon } from "@/app/projects/_components/folder-icon";
import { FolderTag, PROJECT_THUMBNAIL } from "@/app/projects/_components/project-card";
import { formatRelative, plural } from "@/app/projects/_lib/format";
import { folderHex } from "@/lib/projects/folder-colors";
import type {
  OrganizationSummary,
  ProjectFolderRow,
  ProjectRow,
} from "@/lib/projects/types";
import { ArrowLeft, ChevronRight, Clock, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function shortProjectId(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function ProjectBreadcrumb({
  project,
  folder,
  organization,
}: {
  project: ProjectRow;
  folder: ProjectFolderRow | null;
  organization: OrganizationSummary | null;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-3">
      <Link href="/projects" className="studio-icon-btn h-8 w-8 shrink-0 bg-[var(--studio-card)]" aria-label="Back to projects">
        <ArrowLeft />
      </Link>
      <ol className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--studio-muted)]">
        <li className="shrink-0">
          <Link href="/projects" className="transition-colors hover:text-[var(--studio-fg)]">
            {organization?.name ?? "Projects"}
          </Link>
        </li>
        {folder ? (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-[var(--studio-muted-2)]" aria-hidden="true" />
            <li className="flex min-w-0 items-center gap-1.5">
              <FolderIcon color={folderHex(folder.color)} size={13} />
              <span className="truncate">{folder.name}</span>
            </li>
          </>
        ) : null}
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--studio-muted-2)]" aria-hidden="true" />
        <li className="min-w-0 truncate text-[var(--studio-fg)]" aria-current="page">
          {project.name}
        </li>
      </ol>
    </nav>
  );
}

export function ProjectHero({
  project,
  folder,
  organization,
}: {
  project: ProjectRow;
  folder: ProjectFolderRow | null;
  organization: OrganizationSummary | null;
}) {
  const subtitle = [folder?.name ?? "Root workspace", organization?.name].filter(Boolean).join(" · ");

  return (
    <section className="studio-panel studio-hero studio-enter p-4 sm:p-5">
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-7">
        <div className="studio-thumb w-full shrink-0 rounded-[10px] after:hidden lg:w-[280px]">
          <Image src={PROJECT_THUMBNAIL} alt="" fill unoptimized priority sizes="(max-width: 1024px) 100vw, 280px" className="object-cover" />
          <div className="absolute inset-x-2.5 top-2.5 flex gap-1.5">
            <span className="studio-media-chip">
              <Layers />
              {plural(project.scene_count, "SCENE", "SCENES")}
            </span>
            <span className="studio-media-chip border-transparent bg-[rgba(253,79,106,0.85)]">
              #{shortProjectId(project.id)}
            </span>
          </div>
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
            <span className="studio-media-chip">
              <Clock className="text-[var(--studio-accent-2)]" />
              {formatRelative(project.updated_at)}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <FolderTag folder={folder} />
            <span className="studio-media-chip border-[var(--studio-line-strong)] bg-[var(--studio-chip)]">
              ID #{shortProjectId(project.id)}
            </span>
            <span className="text-[11px] font-bold text-[var(--studio-teal)]">
              Updated {formatRelative(project.updated_at)}
            </span>
          </div>
          <h1 className="studio-heading mt-3 break-words text-3xl leading-tight sm:text-4xl">{project.name}</h1>
          <p className="studio-heading mt-1 text-lg font-medium text-[var(--studio-fg-2)]">{subtitle}</p>
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-[var(--studio-muted)]">
            {project.description || "No description yet. Add one from the Settings tab."}
          </p>
        </div>

        <EditorLaunchButton projectId={project.id} className="w-full shrink-0 sm:w-auto lg:self-center" />
      </div>
    </section>
  );
}
