"use client";

import { FolderPicker } from "@/app/projects/_components/entity-dialogs";
import { PanelHeader } from "@/app/projects/_components/panel-header";
import { PROJECT_THUMBNAIL } from "@/app/projects/_components/project-card";
import type { ProjectTabProps } from "@/app/projects/_components/project-detail/types";
import { ConfirmDialog, FormError, StudioField } from "@/app/projects/_components/studio-dialog";
import { useDeleteProject, useUpdateProject } from "@/lib/projects/hooks";
import type { ProjectFolderRow, ProjectRow } from "@/lib/projects/types";
import { Check, CloudUpload, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ThumbnailPanel() {
  return (
    <section className="studio-panel flex flex-col gap-4 p-5 sm:p-6">
      <PanelHeader title="Thumbnail Manager" subtitle="Poster frame used on project cards and review boards" />
      <div className="studio-thumb rounded-[10px] after:hidden" style={{ aspectRatio: "16 / 9" }}>
        <Image src={PROJECT_THUMBNAIL} alt="Current project thumbnail" fill unoptimized sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
      </div>
      <div className="studio-dropzone opacity-70" aria-disabled="true">
        <CloudUpload className="h-6 w-6 text-[var(--studio-muted)]" />
        <p className="text-sm font-bold text-[var(--studio-fg-2)]">Drag and drop a high-res image</p>
        <p className="text-[11px] font-semibold text-[var(--studio-muted)]">Custom thumbnails are coming soon</p>
      </div>
      <p className="text-[11px] font-semibold text-[var(--studio-muted)]">
        Aspect ratio: <span className="text-[var(--studio-fg-2)]">16:9 widescreen</span>
      </p>
    </section>
  );
}

function GeneralForm({ project, folders }: { project: ProjectRow; folders: ProjectFolderRow[] }) {
  const updateProject = useUpdateProject(project.organization_id);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [folderId, setFolderId] = useState(project.folder_id);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    name.trim() !== project.name ||
    description.trim() !== (project.description ?? "") ||
    folderId !== project.folder_id;

  function reset() {
    setName(project.name);
    setDescription(project.description ?? "");
    setFolderId(project.folder_id);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !dirty) return;
    setError(null);
    setSaved(false);
    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: name.trim(),
        description: description.trim() || null,
        folderId,
      });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, "Failed to save settings"));
    }
  }

  const pending = updateProject.isPending;

  return (
    <section className="studio-panel p-5 sm:p-6">
      <PanelHeader title="General Information" subtitle="Name, synopsis, and where the project lives" />
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <StudioField label="Project title" htmlFor="settings-name">
          <input
            id="settings-name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            className="studio-input"
            autoComplete="off"
          />
        </StudioField>

        <StudioField label="Synopsis / description" htmlFor="settings-description" optional>
          <textarea
            id="settings-description"
            rows={4}
            maxLength={400}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            placeholder="What is this project about?"
            className="studio-input"
          />
        </StudioField>

        <StudioField label="Folder">
          <FolderPicker
            folders={folders}
            value={folderId}
            onChange={(next) => {
              setFolderId(next);
              setSaved(false);
            }}
          />
        </StudioField>

        <FormError error={error} />

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
          {saved && !dirty ? (
            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--studio-teal)] sm:mr-auto">
              <Check className="h-3.5 w-3.5" />
              Settings saved
            </span>
          ) : null}
          <button type="button" className="studio-btn studio-btn-ghost" onClick={reset} disabled={!dirty || pending}>
            Cancel changes
          </button>
          <button type="submit" className="studio-btn studio-btn-primary" disabled={!dirty || !name.trim() || pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DangerZone({ project }: { project: ProjectRow }) {
  const router = useRouter();
  const deleteProject = useDeleteProject(project.organization_id);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    try {
      await deleteProject.mutateAsync(project.id);
      router.replace("/projects");
    } catch (e) {
      setError(errorMessage(e, "Failed to delete project"));
    }
  }

  return (
    <section className="studio-panel studio-danger-panel p-5 sm:p-6">
      <PanelHeader
        icon={<TriangleAlert />}
        title="Danger Zone"
        subtitle="Deleting removes this project and all of its scenes. This can't be undone."
      />
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="studio-btn studio-btn-danger"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Trash2 />
          Delete project permanently
        </button>
      </div>

      <ConfirmDialog
        open={open}
        title="Delete project?"
        description={
          <>
            <strong className="text-[var(--studio-fg)]">{project.name}</strong> will be permanently deleted. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete project"
        pending={deleteProject.isPending}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={() => void onConfirm()}
      />
    </section>
  );
}

export function SettingsTab({ project, folders }: ProjectTabProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ThumbnailPanel />
      <div className="flex flex-col gap-5">
        <GeneralForm project={project} folders={folders} />
        <DangerZone project={project} />
      </div>
    </div>
  );
}
