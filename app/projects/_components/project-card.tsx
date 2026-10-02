"use client";

import { FolderIcon } from "@/app/projects/_components/folder-icon";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import { formatDate, plural } from "@/app/projects/_lib/format";
import { folderHex } from "@/lib/projects/folder-colors";
import type { ProjectFolderRow, ProjectRow } from "@/lib/projects/types";
import {
  ArrowUpRight,
  EllipsisVertical,
  FolderInput,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const THUMBNAIL = "/projects/preview-placeholder.svg";

type ProjectItemProps = {
  project: ProjectRow;
  folder?: ProjectFolderRow | null;
  onEdit: () => void;
  onDelete: () => void;
};

function FolderTag({ folder }: { folder?: ProjectFolderRow | null }) {
  if (!folder) {
    return (
      <span className="studio-tag bg-[var(--studio-chip)] text-[var(--studio-muted)]">
        No Folder (Root)
      </span>
    );
  }
  const color = folderHex(folder.color);
  return (
    <span
      className="studio-tag"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <FolderIcon color={color} size={12} />
      <span className="truncate">{folder.name}</span>
    </span>
  );
}

function ProjectMenu({ project, onEdit, onDelete }: ProjectItemProps) {
  return (
    <StudioMenu>
      <StudioMenuTrigger className="studio-icon-btn h-8 w-8" aria-label={`${project.name} actions`}>
        <EllipsisVertical />
      </StudioMenuTrigger>
      <StudioMenuContent>
        <StudioMenuItem asChild>
          <Link href={`/projects/${project.id}`}>
            <ArrowUpRight />
            Open project
          </Link>
        </StudioMenuItem>
        <StudioMenuItem onSelect={onEdit}>
          <Pencil />
          Edit details
        </StudioMenuItem>
        <StudioMenuItem onSelect={onEdit}>
          <FolderInput />
          Move to folder
        </StudioMenuItem>
        <StudioMenuSeparator />
        <StudioMenuItem danger onSelect={onDelete}>
          <Trash2 />
          Delete project
        </StudioMenuItem>
      </StudioMenuContent>
    </StudioMenu>
  );
}

function SceneCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--studio-fg-2)]">
      <Layers className="h-3.5 w-3.5 text-[var(--studio-muted)]" />
      {plural(count, "Scene")}
    </span>
  );
}

export function ProjectCard(props: ProjectItemProps) {
  const { project, folder } = props;
  const href = `/projects/${project.id}`;

  return (
    <article className="studio-card studio-lift studio-project-card flex flex-col">
      <Link href={href} className="studio-thumb" aria-label={`Open ${project.name}`}>
        <Image
          src={THUMBNAIL}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
        />
        <span className="studio-thumb-cta">
          Open project
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <div className="-mt-6 flex flex-1 flex-col gap-3 px-4 pb-4 sm:px-5">
        <div className="relative flex items-center justify-between gap-3">
          <FolderTag folder={folder} />
          <time dateTime={project.created_at} className="shrink-0 text-xs font-bold text-[var(--studio-fg-2)]">
            {formatDate(project.created_at)}
          </time>
        </div>

        <div className="min-w-0">
          <Link href={href}>
            <h3 className="studio-heading truncate text-xl leading-snug transition-colors hover:text-[var(--studio-accent-2)]">
              {project.name}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[var(--studio-muted)]">
            {project.description || "No description yet."}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <SceneCount count={project.scene_count} />
          <div className="flex items-center gap-1">
            <Link href={href} className="studio-chip-btn">
              Details
            </Link>
            <ProjectMenu {...props} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectListRow(props: ProjectItemProps) {
  const { project, folder } = props;
  const href = `/projects/${project.id}`;

  return (
    <article className="studio-card studio-project-card flex items-center gap-3 p-2.5 pr-3 sm:gap-4">
      <Link href={href} className="studio-thumb w-24 shrink-0 rounded-lg sm:w-32" aria-label={`Open ${project.name}`}>
        <Image src={THUMBNAIL} alt="" fill unoptimized sizes="128px" className="object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href}>
          <h3 className="studio-heading truncate text-base leading-snug hover:text-[var(--studio-accent-2)] sm:text-lg">
            {project.name}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <FolderTag folder={folder} />
          <SceneCount count={project.scene_count} />
          <time dateTime={project.created_at} className="text-xs font-semibold text-[var(--studio-muted)]">
            {formatDate(project.created_at)}
          </time>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link href={href} className="studio-chip-btn hidden sm:inline-flex">
          Details
        </Link>
        <ProjectMenu {...props} />
      </div>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="studio-skeleton">
      <div className="aspect-[16/10] bg-[var(--studio-sub)]" />
      <div className="h-[150px]" />
    </div>
  );
}
