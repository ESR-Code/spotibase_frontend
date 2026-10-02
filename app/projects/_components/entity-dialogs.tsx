"use client";

import { FolderIcon } from "@/app/projects/_components/folder-icon";
import {
  DialogActions,
  FormError,
  StudioDialog,
  StudioField,
} from "@/app/projects/_components/studio-dialog";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuRadioGroup,
  StudioMenuRadioItem,
  StudioMenuSeparator,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import {
  FOLDER_COLORS,
  FOLDER_COLOR_HEX,
  FOLDER_COLOR_LABEL,
  folderHex,
  isFolderColor,
  type FolderColor,
} from "@/lib/projects/folder-colors";
import type { ProjectFolderRow, ProjectRow } from "@/lib/projects/types";
import { Check, ChevronDown, FolderPlus, Inbox, Pencil, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

type CommonProps = {
  open: boolean;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
};

// ---------- Folder ----------

export function FolderDialog({
  folder,
  onSubmit,
  ...common
}: CommonProps & {
  folder?: ProjectFolderRow | null;
  onSubmit: (input: { name: string; color: FolderColor }) => void;
}) {
  const editing = Boolean(folder);
  return (
    <StudioDialog
      open={common.open}
      onClose={common.onClose}
      title={editing ? "Edit folder" : "New folder"}
      description={editing ? "Rename the folder or give it a new color." : "Group related projects together."}
      icon={editing ? <Pencil /> : <FolderPlus />}
    >
      <FolderForm folder={folder} onSubmit={onSubmit} {...common} />
    </StudioDialog>
  );
}

function FolderForm({
  folder,
  pending,
  error,
  onClose,
  onSubmit,
}: CommonProps & {
  folder?: ProjectFolderRow | null;
  onSubmit: (input: { name: string; color: FolderColor }) => void;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [color, setColor] = useState<FolderColor>(
    folder && isFolderColor(folder.color) ? folder.color : "crimson",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) onSubmit({ name: name.trim(), color });
  }

  const hex = FOLDER_COLOR_HEX[color];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div
        className="flex items-center gap-4 rounded-xl p-4 transition-colors"
        style={{ background: `color-mix(in srgb, ${hex} 9%, var(--studio-sub))` }}
      >
        <FolderIcon color={hex} size={52} />
        <div className="min-w-0">
          <p className="studio-heading truncate text-lg">{name.trim() || "Untitled folder"}</p>
          <p className="text-xs font-semibold text-[var(--studio-muted)]">{FOLDER_COLOR_LABEL[color]} folder</p>
        </div>
      </div>

      <StudioField label="Folder name" htmlFor="folder-name">
        <input
          id="folder-name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Commercial VFX 2026"
          className="studio-input"
          autoComplete="off"
          autoFocus
        />
      </StudioField>

      <StudioField label="Color">
        <div role="radiogroup" aria-label="Folder color" className="flex flex-wrap gap-2.5">
          {FOLDER_COLORS.map((option) => {
            const active = option === color;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={FOLDER_COLOR_LABEL[option]}
                title={FOLDER_COLOR_LABEL[option]}
                onClick={() => setColor(option)}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: FOLDER_COLOR_HEX[option],
                  boxShadow: active
                    ? `0 0 0 2px var(--studio-card), 0 0 0 4px ${FOLDER_COLOR_HEX[option]}`
                    : "none",
                }}
              >
                {active ? <Check className="h-4 w-4 text-[#0d1323]" strokeWidth={3} /> : null}
              </button>
            );
          })}
        </div>
      </StudioField>

      <FormError error={error} />
      <DialogActions
        onCancel={onClose}
        pending={pending}
        submitLabel={folder ? "Save changes" : "Create folder"}
        pendingLabel={folder ? "Saving…" : "Creating…"}
      />
    </form>
  );
}

// ---------- Project ----------

export type ProjectFormValues = {
  name: string;
  description: string;
  folderId: string | null;
};

export function ProjectDialog({
  project,
  defaultFolderId,
  folders,
  onSubmit,
  ...common
}: CommonProps & {
  project?: ProjectRow | null;
  defaultFolderId?: string | null;
  folders: ProjectFolderRow[];
  onSubmit: (values: ProjectFormValues) => void;
}) {
  const editing = Boolean(project);
  return (
    <StudioDialog
      open={common.open}
      onClose={common.onClose}
      title={editing ? "Edit project" : "New project"}
      description={
        editing
          ? "Update the details or move it to another folder."
          : "Start a new hotspot experience. You can keep it at the root or put it in a folder."
      }
      icon={editing ? <Pencil /> : <Sparkles />}
    >
      <ProjectForm
        project={project}
        defaultFolderId={defaultFolderId}
        folders={folders}
        onSubmit={onSubmit}
        {...common}
      />
    </StudioDialog>
  );
}

function ProjectForm({
  project,
  defaultFolderId,
  folders,
  pending,
  error,
  onClose,
  onSubmit,
}: CommonProps & {
  project?: ProjectRow | null;
  defaultFolderId?: string | null;
  folders: ProjectFolderRow[];
  onSubmit: (values: ProjectFormValues) => void;
}) {
  const [folderId, setFolderId] = useState<string | null>(
    project ? project.folder_id : (defaultFolderId ?? null),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    onSubmit({
      name,
      description: String(form.get("description") ?? "").trim(),
      folderId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StudioField label="Project name" htmlFor="project-name">
        <input
          id="project-name"
          name="name"
          required
          maxLength={120}
          defaultValue={project?.name ?? ""}
          placeholder="e.g. Nordic Residence Walkthrough"
          className="studio-input"
          autoComplete="off"
          autoFocus
        />
      </StudioField>

      <StudioField label="Description" htmlFor="project-description" optional>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          maxLength={400}
          defaultValue={project?.description ?? ""}
          placeholder="What is this project about?"
          className="studio-input"
        />
      </StudioField>

      <StudioField label="Folder">
        <FolderPicker folders={folders} value={folderId} onChange={setFolderId} />
      </StudioField>

      <FormError error={error} />
      <DialogActions
        onCancel={onClose}
        pending={pending}
        submitLabel={project ? "Save changes" : "Create project"}
        pendingLabel={project ? "Saving…" : "Creating…"}
      />
    </form>
  );
}

const ROOT_VALUE = "__root__";

function FolderPicker({
  folders,
  value,
  onChange,
}: {
  folders: ProjectFolderRow[];
  value: string | null;
  onChange: (folderId: string | null) => void;
}) {
  const selected = folders.find((f) => f.id === value) ?? null;

  return (
    <StudioMenu>
      <StudioMenuTrigger className="studio-input flex items-center gap-2.5 text-left">
        {selected ? (
          <FolderIcon color={folderHex(selected.color)} size={18} />
        ) : (
          <Inbox className="h-4 w-4 text-[var(--studio-muted)]" />
        )}
        <span className="min-w-0 flex-1 truncate">{selected ? selected.name : "No folder (root)"}</span>
        <ChevronDown className="h-4 w-4 text-[var(--studio-muted)]" />
      </StudioMenuTrigger>
      <StudioMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <StudioMenuRadioGroup
          value={value ?? ROOT_VALUE}
          onValueChange={(next) => onChange(next === ROOT_VALUE ? null : next)}
        >
          <StudioMenuRadioItem value={ROOT_VALUE}>
            <Inbox />
            No folder (root)
          </StudioMenuRadioItem>
          {folders.length ? <StudioMenuSeparator /> : null}
          {folders.map((folder) => (
            <StudioMenuRadioItem key={folder.id} value={folder.id}>
              <FolderIcon color={folderHex(folder.color)} size={16} />
              <span className="truncate">{folder.name}</span>
            </StudioMenuRadioItem>
          ))}
        </StudioMenuRadioGroup>
      </StudioMenuContent>
    </StudioMenu>
  );
}
