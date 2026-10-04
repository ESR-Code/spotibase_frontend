"use client";

import { PanelBadge, PanelHeader } from "@/app/projects/_components/panel-header";
import type { ProjectTabProps } from "@/app/projects/_components/project-detail/types";
import { editorHref } from "@/app/projects/_components/editor-launch-button";
import { formatBytes, formatDate, formatRelative, formatTimeUtc, plural } from "@/app/projects/_lib/format";
import { useProjectAssetStats } from "@/lib/projects/hooks";
import type { ProjectAssetStats } from "@/lib/projects/types";
import { Box, Check, Copy, File, FileText, ImageIcon, Info, Lock, Pencil, Play } from "lucide-react";
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

function KindChip({
  icon,
  label,
  count,
  color,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--studio-chip)] px-2.5 py-1 text-[11px] font-bold text-[var(--studio-fg-2)]">
      <span className="[&_svg]:h-3.5 [&_svg]:w-3.5" style={{ color }}>
        {icon}
      </span>
      <span>{label}</span>
      <span className="font-mono text-[var(--studio-fg)]">{count}</span>
    </span>
  );
}

function LibrarySizeTile({
  stats,
  loading,
  failed,
}: {
  stats: ProjectAssetStats | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const total =
    (stats?.image_count ?? 0) + (stats?.model_count ?? 0) + (stats?.other_count ?? 0);
  return (
    <MetaTile
      label="Library size"
      caption={
        loading ? "Reading ready files…" : failed ? "Couldn’t load library size" : plural(total, "ready file")
      }
    >
      {loading ? (
        <span className="studio-skeleton inline-block h-5 w-20 rounded-md" />
      ) : failed ? (
        <span className="text-[var(--studio-muted)]">—</span>
      ) : (
        formatBytes(stats?.total_bytes ?? 0)
      )}
    </MetaTile>
  );
}

function AssetKindsTile({
  stats,
  loading,
  failed,
}: {
  stats: ProjectAssetStats | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const kinds = [
    { id: "image", label: "Image", count: stats?.image_count ?? 0, icon: <ImageIcon />, color: "#4cd7f6" },
    { id: "glb", label: "GLB", count: stats?.model_count ?? 0, icon: <Box />, color: "#fd4f6a" },
    { id: "other", label: "Other", count: stats?.other_count ?? 0, icon: <File />, color: "#f4a740" },
  ].filter((kind) => kind.count > 0);

  return (
    <MetaTile label="Assets" caption="Ready files in the project library">
      {loading ? (
        <span className="flex gap-2">
          <span className="studio-skeleton inline-block h-7 w-20 rounded-lg" />
          <span className="studio-skeleton inline-block h-7 w-16 rounded-lg" />
        </span>
      ) : failed ? (
        <span className="text-[var(--studio-muted)]">Couldn’t load assets</span>
      ) : kinds.length === 0 ? (
        <span className="text-[var(--studio-muted)]">No assets yet</span>
      ) : (
        <span className="flex flex-wrap gap-2">
          {kinds.map((kind) => (
            <KindChip
              key={kind.id}
              icon={kind.icon}
              label={kind.label}
              count={kind.count}
              color={kind.color}
            />
          ))}
        </span>
      )}
    </MetaTile>
  );
}

export function DetailsTab({ project, onTabChange }: ProjectTabProps) {
  const statsQuery = useProjectAssetStats(project.id);

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

          <MetaTile label="Total scene count" caption="3D models, 2D images, and geo maps">
            {plural(project.scene_count, "Scene")}
          </MetaTile>

          <LibrarySizeTile
            stats={statsQuery.data}
            loading={statsQuery.isLoading}
            failed={statsQuery.isError}
          />

          <AssetKindsTile
            stats={statsQuery.data}
            loading={statsQuery.isLoading}
            failed={statsQuery.isError}
          />

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
