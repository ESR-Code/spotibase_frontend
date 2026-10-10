"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  History,
  Link2,
  Loader2,
  Lock,
  Rocket,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { authClient } from "@/lib/auth/client";
import { confirmDelete } from "@/lib/editor/confirm";
import {
  publishPasswordSchema,
  type PublishPasswordValues,
} from "@/lib/editor/forms/schemas/publish-password.schema";
import { useProjectPersistStore } from "@/lib/editor/persist/persist-store";
import {
  loadPublishState,
  setPublishPassword,
  unpublishProject,
  type PublishState,
  type PublishVersion,
} from "@/lib/editor/publish/api";
import { publishCurrentProject } from "@/lib/editor/publish/publish-flow";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { toast } from "@/lib/editor/toast";
import { cn } from "@/lib/utils";

const MAX_VERSIONS = 5;

type Busy = "publish" | "unpublish" | "password" | null;

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PublishDialog() {
  const open = useUIStore((s) => s.publishDialogOpen);
  const setOpen = useUIStore((s) => s.setPublishDialogOpen);
  if (!open) return null;
  return <PublishSettings onClose={() => setOpen(false)} />;
}

function PublishSettings({ onClose }: { onClose: () => void }) {
  const projectId = useProjectPersistStore((s) => s.projectId);
  const projectName = useProjectPersistStore((s) => s.projectName);
  const dirty = useProjectPersistStore((s) => s.dirty);
  const revision = useProjectPersistStore((s) => s.revision);

  const [state, setState] = useState<PublishState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      setState(await loadPublishState(projectId));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load publish settings");
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    loadPublishState(projectId)
      .then((next) => {
        if (cancelled) return;
        setState(next);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Could not load publish settings");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    authClient.getSession().then((result) => {
      if (!cancelled) setUserId(result.data?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = state === null && loadError === null;
  const live = state?.versions.find((v) => v.status === "published") ?? null;
  const upToDate =
    live != null && !dirty && live.editorRevision != null && revision <= live.editorRevision;
  const protectedOn = state?.passwordProtected ?? false;
  const working = busy !== null;

  const publish = async () => {
    setBusy("publish");
    await publishCurrentProject();
    await refresh();
    setBusy(null);
  };

  const unpublish = async () => {
    if (!projectId) return;
    const accepted = await confirmDelete({
      subject: "version",
      title: "Unpublish project",
      description: "The live version goes offline right away. Version history is kept.",
      confirmLabel: "Unpublish",
    });
    if (!accepted) return;
    setBusy("unpublish");
    try {
      await unpublishProject(projectId);
      toast.success("Project unpublished");
      await refresh();
    } catch (error) {
      toast.error("Could not unpublish", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setBusy(null);
  };

  const savePassword = async (password: string | null) => {
    if (!projectId) return false;
    setBusy("password");
    try {
      await setPublishPassword(projectId, password);
      toast.success(password ? "Password saved" : "Password protection removed");
      await refresh();
      return true;
    } catch (error) {
      toast.error("Could not update the password", {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const selectAccess = async (mode: "public" | "password") => {
    if (mode === "password") {
      if (!protectedOn) setPasswordFormOpen(true);
      return;
    }
    if (!protectedOn) {
      setPasswordFormOpen(false);
      return;
    }
    const accepted = await confirmDelete({
      subject: "password",
      title: "Remove password protection",
      description: "Anyone with the link will be able to open the published project.",
      confirmLabel: "Remove password",
    });
    if (!accepted) return;
    if (await savePassword(null)) setPasswordFormOpen(false);
  };

  const publishLabel = live ? "Publish update" : "Publish";

  return (
    <EditorDialog
      open
      onClose={onClose}
      presentation="modal"
      backdrop
      backdropBlur
      size="medium"
      className="editor-publish-dialog"
    >
      <EditorDialog.Header>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="editor-publish-header-icon" aria-hidden>
            <Rocket className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold">Publish</div>
            <div className="truncate text-[11.5px]" style={{ color: "var(--editor-muted)" }}>
              {projectName || "Untitled project"}
            </div>
          </div>
        </div>
        <IconButton title="Close" onClick={onClose}>
          <X />
        </IconButton>
      </EditorDialog.Header>

      <EditorDialog.Body className="space-y-5">
        {loadError ? (
          <div className="editor-publish-notice is-danger" role="alert">
            <span className="min-w-0 flex-1">{loadError}</span>
            <button type="button" className="editor-publish-link" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : null}

        <StatusCard loading={loading} live={live} upToDate={upToDate} dirty={dirty} userId={userId} />

        <Section title="Access">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who can view">
            <AccessOption
              icon={Globe}
              title="Public"
              description="Anyone with the link"
              selected={!protectedOn && !passwordFormOpen}
              disabled={loading || working}
              onSelect={() => void selectAccess("public")}
            />
            <AccessOption
              icon={Lock}
              title="Password"
              description="Viewers enter a password"
              selected={protectedOn || passwordFormOpen}
              disabled={loading || working}
              onSelect={() => void selectAccess("password")}
            />
          </div>

          {protectedOn && !passwordFormOpen ? (
            <div className="editor-publish-row">
              <span className="editor-publish-row-icon is-teal">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold">Password is set</div>
                <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
                  It is stored hashed and can&apos;t be shown again.
                </div>
              </div>
              <EditorButton
                className="h-7 px-2.5 text-[11.5px]"
                disabled={working}
                onClick={() => setPasswordFormOpen(true)}
              >
                Change
              </EditorButton>
            </div>
          ) : null}

          {passwordFormOpen ? (
            <PasswordForm
              busy={busy === "password"}
              replacing={protectedOn}
              onCancel={() => setPasswordFormOpen(false)}
              onSubmit={async (password) => {
                if (await savePassword(password)) setPasswordFormOpen(false);
              }}
            />
          ) : null}
        </Section>

        <Section
          title="Viewer link"
          aside={<span className="editor-publish-soon">Coming soon</span>}
        >
          <div className="editor-publish-link-field" aria-disabled>
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              A shareable link appears here once the viewer ships.
            </span>
            <button type="button" className="editor-publish-copy" disabled title="Copy link">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </Section>

        <Section
          title="Versions"
          aside={
            state ? (
              <RetentionMeter used={state.versions.length} max={MAX_VERSIONS} />
            ) : null
          }
        >
          <VersionList loading={loading} versions={state?.versions ?? []} userId={userId} />
        </Section>
      </EditorDialog.Body>

      <EditorDialog.Footer>
        <div>
          {live ? (
            <EditorButton
              variant="ghost"
              className="editor-publish-unpublish h-8 px-3 text-[12px]"
              disabled={working}
              onClick={() => void unpublish()}
            >
              {busy === "unpublish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Unpublish
            </EditorButton>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <EditorButton variant="ghost" className="h-8 px-3 text-[12px]" onClick={onClose}>
            Close
          </EditorButton>
          <EditorButton
            variant="primary"
            className="h-8 gap-1.5 px-3.5 text-[12px]"
            disabled={loading || working || upToDate}
            title={
              upToDate
                ? "The live version already matches your saved project"
                : dirty
                  ? "Saves your changes, then publishes"
                  : undefined
            }
            onClick={() => void publish()}
          >
            {busy === "publish" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : upToDate ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            {busy === "publish"
              ? dirty
                ? "Saving…"
                : "Publishing…"
              : upToDate
                ? "Up to date"
                : dirty
                  ? `Save & ${publishLabel.toLowerCase()}`
                  : publishLabel}
          </EditorButton>
        </div>
      </EditorDialog.Footer>
    </EditorDialog>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="editor-publish-section-title">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StatusCard({
  loading,
  live,
  upToDate,
  dirty,
  userId,
}: {
  loading: boolean;
  live: PublishVersion | null;
  upToDate: boolean;
  dirty: boolean;
  userId: string | null;
}) {
  if (loading) {
    return (
      <div className="editor-publish-hero" aria-busy>
        <span className="editor-publish-skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <span className="editor-publish-skeleton block h-3.5 w-28" />
          <span className="editor-publish-skeleton block h-3 w-48" />
        </div>
      </div>
    );
  }

  const byYou = live && userId && live.created_by === userId ? " by you" : "";

  return (
    <div className={cn("editor-publish-hero", live && "is-live")}>
      <span className={cn("editor-publish-status-dot", live && "is-live")} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] font-bold">
            {live ? "Live" : "Not published"}
          </span>
          {live ? <span className="editor-publish-version">v{live.version}</span> : null}
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--editor-muted)" }}>
          {live ? (
            <span title={fullDate(live.created_at)}>
              Published {timeAgo(live.created_at)}
              {byYou}
            </span>
          ) : (
            "Publishing creates a fixed snapshot of your saved project for viewers."
          )}
        </div>
        {live ? (
          upToDate ? (
            <div className="editor-publish-notice is-ok mt-2.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              The live version matches your saved project.
            </div>
          ) : (
            <div className="editor-publish-notice is-warn mt-2.5">
              <span className="editor-publish-notice-dot" aria-hidden />
              {dirty
                ? "You have unsaved changes that aren't live yet."
                : "Your saved project has changes that aren't live yet."}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function AccessOption({
  icon: Icon,
  title,
  description,
  selected,
  disabled,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={cn("editor-publish-option", selected && "is-selected")}
      onClick={onSelect}
    >
      <span className="editor-publish-option-icon">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[12.5px] font-semibold">{title}</span>
        <span className="block truncate text-[11px]" style={{ color: "var(--editor-muted)" }}>
          {description}
        </span>
      </span>
      <span className="editor-publish-radio" aria-hidden />
    </button>
  );
}

function RetentionMeter({ used, max }: { used: number; max: number }) {
  return (
    <div
      className="flex items-center gap-2 text-[11px]"
      style={{ color: "var(--editor-muted)" }}
      title={`Only the last ${max} versions are kept`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn("editor-publish-meter-cell", i < used && "is-filled")} />
        ))}
      </span>
      {used} of {max} kept
    </div>
  );
}

function VersionList({
  loading,
  versions,
  userId,
}: {
  loading: boolean;
  versions: PublishVersion[];
  userId: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {[0, 1].map((i) => (
          <span key={i} className="editor-publish-skeleton block h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="editor-publish-empty">
        <History className="h-5 w-5 opacity-50" />
        <div className="text-[12px] font-semibold">No versions yet</div>
        <div className="text-[11px]">Each publish adds a version here.</div>
      </div>
    );
  }

  return (
    <ol className="editor-publish-versions">
      {versions.map((v) => {
        const isLive = v.status === "published";
        return (
          <li key={v.id} className={cn("editor-publish-version-row", isLive && "is-live")}>
            <span className="editor-publish-timeline-dot" aria-hidden />
            <span className="editor-publish-version">v{v.version}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px]" title={fullDate(v.created_at)}>
              <span style={{ color: "var(--editor-fg)" }}>{fullDate(v.created_at)}</span>
              <span style={{ color: "var(--editor-muted)" }}>
                {" · "}
                {timeAgo(v.created_at)}
                {userId && v.created_by === userId ? " · you" : ""}
              </span>
            </span>
            {isLive ? (
              <span className="editor-publish-pill is-live">
                <span className="editor-publish-pill-dot" aria-hidden />
                Live
              </span>
            ) : (
              <span className="editor-publish-pill">Archived</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PasswordForm({
  busy,
  replacing,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  replacing: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void | Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PublishPasswordValues>({
    resolver: zodResolver(publishPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  return (
    <form
      className="editor-publish-form"
      onSubmit={handleSubmit((values) => onSubmit(values.password))}
      noValidate
    >
      <div className="text-[12px] font-semibold">
        {replacing ? "Set a new password" : "Choose a password"}
      </div>
      <PasswordInput
        id="publish-password"
        label="Password"
        visible={visible}
        onToggleVisible={() => setVisible((v) => !v)}
        error={errors.password?.message}
        autoFocus
        {...register("password")}
      />
      <PasswordInput
        id="publish-password-confirm"
        label="Confirm password"
        visible={visible}
        error={errors.confirm?.message}
        {...register("confirm")}
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
          At least 8 characters.
        </span>
        <div className="flex gap-2">
          <EditorButton
            type="button"
            variant="ghost"
            className="h-8 px-3 text-[12px]"
            onClick={onCancel}
          >
            Cancel
          </EditorButton>
          <EditorButton
            type="submit"
            variant="primary"
            className="h-8 gap-1.5 px-3 text-[12px]"
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Save password
          </EditorButton>
        </div>
      </div>
    </form>
  );
}

type PasswordInputProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  visible: boolean;
  onToggleVisible?: () => void;
  error?: string;
};

function PasswordInput({
  id,
  label,
  visible,
  onToggleVisible,
  error,
  ...input
}: PasswordInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="editor-field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("editor-input w-full", onToggleVisible && "pr-9", error && "is-invalid")}
          {...input}
        />
        {onToggleVisible ? (
          <button
            type="button"
            className="editor-publish-eye"
            title={visible ? "Hide password" : "Show password"}
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={onToggleVisible}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <div id={`${id}-error`} className="editor-publish-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
