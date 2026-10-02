"use client";

import { FolderIcon } from "@/app/projects/_components/folder-icon";
import { PanelBadge, PanelHeader } from "@/app/projects/_components/panel-header";
import type { ProjectTabProps } from "@/app/projects/_components/project-detail/types";
import { editorHref } from "@/app/projects/_components/editor-launch-button";
import { formatDate, formatRelative, formatTimeUtc, plural } from "@/app/projects/_lib/format";
import { folderHex } from "@/lib/projects/folder-colors";
import { Check, Copy, FileText, Info, Inbox, Lock, Pencil, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

function MetaTile({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="studio-tile flex min-w-0 flex-col gap-2">
      <p className="studio-eyebrow">{label}</p>
      <div className="min-w-0 text-[15px] font-bold text-[var(--studio-fg)]">{children}</div>
      {caption ? <div className="text-[11px] font-semibold text-[var(--studio-muted)]">{caption}</div> : null}
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className="studio-icon-btn h-7 w-7 shrink-0 [&_svg]:!h-3.5 [&_svg]:!w-3.5"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true));
      }}
    >
      {copied ? <Check className="text-[var(--studio-teal)]" /> : <Copy />}
    </button>
  );
}

export function DetailsTab({ project, folder, organization, onTabChange }: ProjectTabProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="studio-panel p-5 sm:p-6 lg:col-span-2">
        <PanelHeader
          icon={<Info />}
          title="Project Metadata"
          subtitle="Core specifications, history, and workspace attributes"
          aside={<PanelBadge icon={<Lock />}>Organization-scoped access</PanelBadge>}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MetaTile label="Created date" caption={formatRelative(project.created_at)}>
            <time dateTime={project.created_at}>
              {formatDate(project.created_at)}
              <span className="ml-1.5 font-mono text-xs text-[var(--studio-muted)]">
                ({formatTimeUtc(project.created_at)})
              </span>
            </time>
          </MetaTile>

          <MetaTile label="Last updated" caption={formatTimeUtc(project.updated_at)}>
            <time dateTime={project.updated_at}>
              {formatDate(project.updated_at)}
              <span className="ml-1.5 text-xs text-[var(--studio-teal)]">· {formatRelative(project.updated_at)}</span>
            </time>
          </MetaTile>

          <MetaTile label="Parent folder" caption={`Workspace: ${organization?.name ?? "—"}`}>
            <span className="flex min-w-0 items-center gap-2">
              {folder ? (
                <FolderIcon color={folderHex(folder.color)} size={18} />
              ) : (
                <Inbox className="h-4 w-4 shrink-0 text-[var(--studio-muted)]" />
              )}
              <span className="truncate">{folder?.name ?? "No folder (root)"}</span>
            </span>
          </MetaTile>

          <MetaTile label="Total scene count" caption="3D models, 2D images, and geo maps">
            {plural(project.scene_count, "Scene")}
          </MetaTile>

          <MetaTile label="Organization" caption={organization?.slug ? `/${organization.slug}` : undefined}>
            <span className="block truncate">{organization?.name ?? "—"}</span>
          </MetaTile>

          <MetaTile label="Project ID" caption="Use this when referencing the project in APIs">
            <span className="flex min-w-0 items-center gap-1">
              <code className="min-w-0 truncate font-mono text-xs text-[var(--studio-fg-2)]">{project.id}</code>
              <CopyButton value={project.id} label="Copy project ID" />
            </span>
          </MetaTile>
        </div>
      </section>

      <section className="studio-panel flex flex-col p-5 sm:p-6">
        <PanelHeader icon={<FileText />} title="About" subtitle="Synopsis shown on project cards" />
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[var(--studio-fg-2)]">
          {project.description || (
            <span className="text-[var(--studio-muted)]">No description yet.</span>
          )}
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row lg:flex-col xl:flex-row">
          <button type="button" className="studio-btn flex-1" onClick={() => onTabChange("settings")}>
            <Pencil />
            Edit details
          </button>
          <Link href={editorHref(project.id)} className="studio-btn studio-btn-ghost flex-1">
            <Play />
            Open editor
          </Link>
        </div>
      </section>
    </div>
  );
}
