"use client";

import { FolderIcon } from "@/app/projects/_components/folder-icon";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import { formatRelative, plural } from "@/app/projects/_lib/format";
import { folderHex } from "@/lib/projects/folder-colors";
import type { ProjectFolderRow } from "@/lib/projects/types";
import { EllipsisVertical, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";

export function FolderCard({
  folder,
  projectCount,
  selected,
  onSelect,
  onEdit,
  onAddProject,
  onDelete,
}: {
  folder: ProjectFolderRow;
  projectCount: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onAddProject: () => void;
  onDelete: () => void;
}) {
  const color = folderHex(folder.color);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      data-selected={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="studio-card studio-lift studio-folder-card flex min-h-[148px] flex-col p-4 sm:p-5"
      style={{ "--folder-color": color } as CSSProperties}
    >
      <div className="relative flex items-start justify-between gap-2">
        <FolderIcon color={color} size={46} className="studio-folder-icon" />
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <StudioMenu>
            <StudioMenuTrigger className="studio-icon-btn -mr-2 -mt-2" aria-label={`${folder.name} actions`}>
              <EllipsisVertical />
            </StudioMenuTrigger>
            <StudioMenuContent>
              <StudioMenuItem onSelect={onSelect}>
                <FolderOpen />
                {selected ? "Show all projects" : "Open folder"}
              </StudioMenuItem>
              <StudioMenuItem onSelect={onAddProject}>
                <Plus />
                New project here
              </StudioMenuItem>
              <StudioMenuItem onSelect={onEdit}>
                <Pencil />
                Rename & recolor
              </StudioMenuItem>
              <StudioMenuSeparator />
              <StudioMenuItem danger onSelect={onDelete}>
                <Trash2 />
                Delete folder
              </StudioMenuItem>
            </StudioMenuContent>
          </StudioMenu>
        </div>
      </div>

      <div className="relative mt-auto pt-5">
        <h3 className="studio-heading truncate text-[17px] leading-snug sm:text-lg">{folder.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--studio-muted)]">
          <span>{plural(projectCount, "project")}</span>
          <span className="text-[var(--studio-muted-2)]">·</span>
          <span className="truncate text-[var(--studio-muted-2)]">{formatRelative(folder.updated_at)}</span>
        </p>
      </div>
    </div>
  );
}

export function FolderCardSkeleton() {
  return <div className="studio-skeleton h-[148px]" />;
}
