"use client";

import {
  FolderDialog,
  ProjectDialog,
  type ProjectFormValues,
} from "@/app/projects/_components/entity-dialogs";
import { FolderCard, FolderCardSkeleton } from "@/app/projects/_components/folder-card";
import { FolderIcon } from "@/app/projects/_components/folder-icon";
import { OrgSelector } from "@/app/projects/_components/org-selector";
import {
  ProjectCard,
  ProjectCardSkeleton,
  ProjectListRow,
} from "@/app/projects/_components/project-card";
import { ProjectsFooter } from "@/app/projects/_components/projects-footer";
import { ProjectsTopbar } from "@/app/projects/_components/projects-topbar";
import { ConfirmDialog } from "@/app/projects/_components/studio-dialog";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuLabel,
  StudioMenuRadioGroup,
  StudioMenuRadioItem,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import { WorkspaceSummary } from "@/app/projects/_components/workspace-summary";
import { plural } from "@/app/projects/_lib/format";
import { folderHex } from "@/lib/projects/folder-colors";
import {
  useCreateFolder,
  useCreateProject,
  useDeleteFolder,
  useDeleteProject,
  useFolders,
  useProjects,
  useUpdateFolder,
  useUpdateProject,
} from "@/lib/projects/hooks";
import type {
  OrganizationSummary,
  ProjectFolderRow,
  ProjectRow,
} from "@/lib/projects/types";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  FolderPlus,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ProjectTab = "all" | "recent" | "in-folders" | "root";
type SortKey = "updated" | "created" | "name";
type ViewMode = "grid" | "list";

type DialogState =
  | { type: "create-folder" }
  | { type: "edit-folder"; folder: ProjectFolderRow }
  | { type: "delete-folder"; folder: ProjectFolderRow }
  | { type: "create-project"; folderId: string | null }
  | { type: "edit-project"; project: ProjectRow }
  | { type: "delete-project"; project: ProjectRow };

const TABS: { id: ProjectTab; label: string }[] = [
  { id: "all", label: "All Projects" },
  { id: "recent", label: "Recent" },
  { id: "in-folders", label: "In Folders" },
  { id: "root", label: "Root / No Folder" },
];

const SORT_LABEL: Record<SortKey, string> = {
  updated: "Last modified",
  created: "Date created",
  name: "Name",
};

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

function byKey(sort: SortKey) {
  return (
    a: { name: string; created_at: string; updated_at: string },
    b: { name: string; created_at: string; updated_at: string },
  ) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const key = sort === "created" ? "created_at" : "updated_at";
    return Date.parse(b[key]) - Date.parse(a[key]);
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ProjectsDashboard() {
  const [org, setOrg] = useState<OrganizationSummary | null>(null);
  const orgId = org?.id ?? null;
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [tab, setTab] = useState<ProjectTab>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
  const projectsRef = useRef<HTMLElement>(null);

  const orgIdRef = useRef<string | null>(null);
  const onActiveOrg = useCallback((next: OrganizationSummary | null) => {
    if (orgIdRef.current !== (next?.id ?? null)) {
      orgIdRef.current = next?.id ?? null;
      setFolderFilter(null);
    }
    setOrg(next);
  }, []);

  const foldersQuery = useFolders(orgId);
  const projectsQuery = useProjects(orgId);
  const createFolder = useCreateFolder(orgId ?? "");
  const updateFolder = useUpdateFolder(orgId ?? "");
  const deleteFolder = useDeleteFolder(orgId ?? "");
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(orgId ?? "");
  const deleteProject = useDeleteProject(orgId ?? "");

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const isMac = useMemo(() => /Mac|iPhone|iPad/.test(navigator.userAgent), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const countByFolder = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) {
      if (p.folder_id) counts.set(p.folder_id, (counts.get(p.folder_id) ?? 0) + 1);
    }
    return counts;
  }, [projects]);

  const needle = query.trim().toLowerCase();

  const visibleFolders = useMemo(
    () =>
      folders
        .filter((f) => !needle || f.name.toLowerCase().includes(needle))
        .sort(byKey(sort)),
    [folders, needle, sort],
  );

  const visibleProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (folderFilter) return p.folder_id === folderFilter;
        if (tab === "recent") return now - Date.parse(p.updated_at) < RECENT_MS;
        if (tab === "in-folders") return p.folder_id !== null;
        if (tab === "root") return p.folder_id === null;
        return true;
      })
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          (p.description ?? "").toLowerCase().includes(needle),
      )
      .sort(byKey(sort));
  }, [projects, folderFilter, tab, needle, sort, now]);

  const stats = useMemo(
    () => ({
      foldered: projects.filter((p) => p.folder_id).length,
      scenes: projects.reduce((sum, p) => sum + p.scene_count, 0),
    }),
    [projects],
  );

  const activeFolder = folderFilter ? folderById.get(folderFilter) ?? null : null;

  // ---------- Dialog plumbing ----------

  function openDialog(next: DialogState) {
    setError(null);
    setDialog(next);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError(null);
    try {
      await action();
      closeDialog();
    } catch (e) {
      setError(errorMessage(e, fallback));
    }
  }

  function selectFolder(id: string) {
    setFolderFilter((current) => (current === id ? null : id));
    requestAnimationFrame(() =>
      projectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function onProjectSubmit(values: ProjectFormValues) {
    if (dialog?.type === "edit-project") {
      void run(
        () =>
          updateProject.mutateAsync({
            id: dialog.project.id,
            name: values.name,
            description: values.description || null,
            folderId: values.folderId,
          }),
        "Failed to update project",
      );
    } else {
      const organizationId =
        (values.folderId ? folderById.get(values.folderId)?.organization_id : null) ?? orgId;
      if (!organizationId) {
        setError("Select an organization first.");
        return;
      }
      void run(
        () =>
          createProject.mutateAsync({
            organizationId,
            name: values.name,
            description: values.description || undefined,
            folderId: values.folderId,
          }),
        "Failed to create project",
      );
    }
  }

  const loadingFolders = Boolean(orgId) && foldersQuery.isLoading;
  const loadingProjects = Boolean(orgId) && projectsQuery.isLoading;
  const loadError = foldersQuery.error ?? projectsQuery.error;

  return (
    <div className="flex flex-1 flex-col">
      <ProjectsTopbar />

      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-8 px-4 py-5 sm:gap-10 sm:px-6 sm:py-8 lg:px-8">
        {/* Workspace bar */}
        <section className="studio-panel studio-enter flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
            <OrgSelector onActiveOrg={onActiveOrg} />

            <div className="hidden h-8 w-px bg-[var(--studio-line-strong)] lg:block" />

            <label className="studio-search min-w-0 flex-1">
              <Search />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search folders and projects…"
                className="studio-input"
                aria-label="Search folders and projects"
                disabled={!orgId}
              />
              <span className="studio-kbd hidden sm:inline-flex">{isMac ? "⌘K" : "Ctrl K"}</span>
            </label>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                className="studio-btn studio-btn-ghost"
                disabled={!orgId}
                onClick={() => openDialog({ type: "create-folder" })}
              >
                <FolderPlus />
                New Folder
              </button>
              <button
                type="button"
                className="studio-btn studio-btn-primary"
                disabled={!orgId}
                onClick={() => openDialog({ type: "create-project", folderId: folderFilter })}
              >
                <Plus />
                New Project
              </button>
            </div>
          </div>
          {orgId ? (
            <WorkspaceSummary
              projectCount={projects.length}
              folderCount={folders.length}
              foldered={stats.foldered}
              sceneCount={stats.scenes}
            />
          ) : null}
        </section>

        {!orgId ? (
          <EmptyState
            title="Set up your workspace"
            body="Create an organization to start organizing folders and projects."
          />
        ) : (
          <>
            {loadError ? (
              <p className="studio-form-error">{errorMessage(loadError, "Could not load your workspace.")}</p>
            ) : null}

            {/* Folders */}
            <section className="studio-enter flex flex-col gap-4" style={{ animationDelay: "60ms" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="studio-heading text-[28px] leading-none sm:text-3xl">Folders</h2>
                  <span className="studio-pill">{plural(folders.length, "folder")}</span>
                  <span className="text-xs font-semibold text-[var(--studio-muted)]">
                    · {plural(projects.length, "Total Project", "Total Projects")}
                  </span>
                </div>
                <SortMenu value={sort} onChange={setSort} />
              </div>

              {loadingFolders ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <FolderCardSkeleton key={i} />
                  ))}
                </div>
              ) : visibleFolders.length ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {visibleFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      projectCount={countByFolder.get(folder.id) ?? 0}
                      selected={folderFilter === folder.id}
                      onSelect={() => selectFolder(folder.id)}
                      onAddProject={() => openDialog({ type: "create-project", folderId: folder.id })}
                      onEdit={() => openDialog({ type: "edit-folder", folder })}
                      onDelete={() => openDialog({ type: "delete-folder", folder })}
                    />
                  ))}
                </div>
              ) : needle && folders.length ? (
                <p className="text-sm text-[var(--studio-muted)]">No folders match “{query.trim()}”.</p>
              ) : null}
            </section>

            {/* Projects */}
            <section
              ref={projectsRef}
              className="studio-enter flex scroll-mt-24 flex-col gap-4"
              style={{ animationDelay: "120ms" }}
            >
              <div className="studio-subpanel flex items-center justify-between gap-2 p-1.5">
                <div className="studio-tabs min-w-0 flex-1" role="tablist" aria-label="Project filter">
                  {activeFolder ? (
                    <span
                      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg pl-2.5 pr-1 text-[13px] font-semibold"
                      style={{
                        color: folderHex(activeFolder.color),
                        background: `color-mix(in srgb, ${folderHex(activeFolder.color)} 14%, transparent)`,
                      }}
                    >
                      <FolderIcon color={folderHex(activeFolder.color)} size={16} />
                      <span className="max-w-[160px] truncate">{activeFolder.name}</span>
                      <button
                        type="button"
                        onClick={() => setFolderFilter(null)}
                        className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/10"
                        aria-label="Clear folder filter"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : null}
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={!activeFolder && tab === item.id}
                      className="studio-tab"
                      onClick={() => {
                        setFolderFilter(null);
                        setTab(item.id);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="studio-segmented shrink-0" role="group" aria-label="View mode">
                  <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}>
                    <LayoutGrid />
                  </button>
                  <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")}>
                    <List />
                  </button>
                </div>
              </div>

              {loadingProjects ? (
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              ) : visibleProjects.length === 0 ? (
                <EmptyState
                  title={needle ? "No matching projects" : activeFolder ? "This folder is empty" : "No projects here yet"}
                  body={
                    needle
                      ? "Try a different search term."
                      : "Create a project to start placing hotspots on models, images, and maps."
                  }
                  action={
                    needle ? undefined : (
                      <button
                        type="button"
                        className="studio-btn studio-btn-primary"
                        onClick={() => openDialog({ type: "create-project", folderId: folderFilter })}
                      >
                        <Plus />
                        New Project
                      </button>
                    )
                  }
                />
              ) : view === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      folder={project.folder_id ? folderById.get(project.folder_id) : null}
                      onEdit={() => openDialog({ type: "edit-project", project })}
                      onDelete={() => openDialog({ type: "delete-project", project })}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {visibleProjects.map((project) => (
                    <ProjectListRow
                      key={project.id}
                      project={project}
                      folder={project.folder_id ? folderById.get(project.folder_id) : null}
                      onEdit={() => openDialog({ type: "edit-project", project })}
                      onDelete={() => openDialog({ type: "delete-project", project })}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <ProjectsFooter />

      <FolderDialog
        open={dialogOpen && (dialog?.type === "create-folder" || dialog?.type === "edit-folder")}
        folder={dialog?.type === "edit-folder" ? dialog.folder : null}
        pending={createFolder.isPending || updateFolder.isPending}
        error={error}
        onClose={closeDialog}
        onSubmit={(input) =>
          void run(
            () =>
              dialog?.type === "edit-folder"
                ? updateFolder.mutateAsync({ id: dialog.folder.id, ...input })
                : createFolder.mutateAsync(input),
            "Failed to save folder",
          )
        }
      />

      <ConfirmDialog
        open={dialogOpen && dialog?.type === "delete-folder"}
        title="Delete folder?"
        description={
          dialog?.type === "delete-folder" ? (
            <>
              <strong className="text-[var(--studio-fg)]">{dialog.folder.name}</strong> will be removed. Its projects
              stay in the workspace and move to the root.
            </>
          ) : null
        }
        confirmLabel="Delete folder"
        pending={deleteFolder.isPending}
        error={error}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog?.type !== "delete-folder") return;
          const id = dialog.folder.id;
          void run(async () => {
            await deleteFolder.mutateAsync(id);
            setFolderFilter((current) => (current === id ? null : current));
          }, "Failed to delete folder");
        }}
      />

      <ProjectDialog
        open={dialogOpen && (dialog?.type === "create-project" || dialog?.type === "edit-project")}
        project={dialog?.type === "edit-project" ? dialog.project : null}
        defaultFolderId={dialog?.type === "create-project" ? dialog.folderId : null}
        folders={folders}
        pending={createProject.isPending || updateProject.isPending}
        error={error}
        onClose={closeDialog}
        onSubmit={onProjectSubmit}
      />

      <ConfirmDialog
        open={dialogOpen && dialog?.type === "delete-project"}
        title="Delete project?"
        description={
          dialog?.type === "delete-project" ? (
            <>
              <strong className="text-[var(--studio-fg)]">{dialog.project.name}</strong> will be permanently deleted.
              This can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete project"
        pending={deleteProject.isPending}
        error={error}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog?.type !== "delete-project") return;
          const id = dialog.project.id;
          void run(() => deleteProject.mutateAsync(id), "Failed to delete project");
        }}
      />
    </div>
  );
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  return (
    <StudioMenu>
      <StudioMenuTrigger className="studio-btn h-8 gap-2 rounded-lg bg-[var(--studio-card)] px-3 text-xs data-[state=open]:bg-[var(--studio-chip)]">
        <ArrowDownWideNarrow className="!h-3.5 !w-3.5 text-[var(--studio-muted)]" />
        {SORT_LABEL[value]}
        <ChevronDown className="!h-3.5 !w-3.5 text-[var(--studio-muted)]" />
      </StudioMenuTrigger>
      <StudioMenuContent className="w-48">
        <StudioMenuLabel>Sort by</StudioMenuLabel>
        <StudioMenuRadioGroup value={value} onValueChange={(next) => onChange(next as SortKey)}>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <StudioMenuRadioItem key={key} value={key}>
              {SORT_LABEL[key]}
            </StudioMenuRadioItem>
          ))}
        </StudioMenuRadioGroup>
      </StudioMenuContent>
    </StudioMenu>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="studio-panel flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="studio-dialog-icon h-14 w-14 rounded-2xl">
        <Sparkles />
      </span>
      <div>
        <h3 className="studio-heading text-2xl">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--studio-muted)]">{body}</p>
      </div>
      {action}
    </div>
  );
}
