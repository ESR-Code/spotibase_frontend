"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { ViewerShell } from "@/app/view/_components/viewer-shell";
import { ProjectLoadError } from "@/lib/editor/persist/hydrate";
import {
  fetchPublishedSnapshot,
  readViewerToken,
  unlockPublishedProject,
} from "@/lib/viewer/api";
import { bootViewerProject } from "@/lib/viewer/boot";
import { parsePublishedSnapshot, SnapshotFormatError } from "@/lib/viewer/snapshot";

type ViewerState =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "ready" }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Public viewer entry: fetch the live published snapshot (password gate when
 * protected), hydrate the shared editor stores, then mount the Preview shell.
 * Analytics (planned) hooks in here once the viewer is ready.
 */
export function ViewerApp({
  projectId,
  sceneSlug,
}: {
  projectId: string;
  sceneSlug: string | null;
}) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const token = readViewerToken(projectId);
    void fetchPublishedSnapshot(projectId, token).then((result) => {
      if (cancelled) return;
      if (result.status !== "ok") {
        setState(result);
        return;
      }
      try {
        const project = parsePublishedSnapshot(result.snapshot);
        bootViewerProject(project, { token, sceneSlug });
        document.title = project.name || "Spotibase";
        setState({ status: "ready" });
      } catch (error) {
        console.error(error);
        setState({
          status: "error",
          message:
            error instanceof SnapshotFormatError || error instanceof ProjectLoadError
              ? error.message
              : "The tour could not be opened.",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, sceneSlug, attempt]);

  if (state.status === "ready") return <ViewerShell />;

  return (
    <div
      className="editor-root dark flex h-dvh w-full flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ background: "var(--editor-bg)", color: "var(--editor-fg)" }}
    >
      {state.status === "loading" ? (
        <>
          <div className="editor-spinner" />
          <span className="text-[13px]" style={{ color: "var(--editor-muted)" }}>
            Loading tour…
          </span>
        </>
      ) : state.status === "locked" ? (
        <PasswordGate
          projectId={projectId}
          onUnlocked={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <>
          <div className="font-display text-[17px] font-bold">
            {state.status === "not_found" ? "This tour is not available" : "Something went wrong"}
          </div>
          <div className="max-w-md text-[13px]" style={{ color: "var(--editor-muted)" }}>
            {state.status === "not_found"
              ? "It may have been unpublished, or the link is wrong."
              : state.message}
          </div>
          {state.status === "error" ? (
            <EditorButton
              className="mt-2"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </EditorButton>
          ) : null}
        </>
      )}
    </div>
  );
}

function PasswordGate({
  projectId,
  onUnlocked,
}: {
  projectId: string;
  onUnlocked: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="editor-glass editor-panel-shadow flex w-full max-w-[340px] flex-col gap-3 rounded-xl p-6 text-left"
      onSubmit={(event) => {
        event.preventDefault();
        if (!password || busy) return;
        setBusy(true);
        setError(null);
        void unlockPublishedProject(projectId, password).then((result) => {
          setBusy(false);
          if (result.ok) onUnlocked();
          else setError(result.message);
        });
      }}
    >
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" style={{ color: "var(--editor-muted)" }} />
        <div className="font-display text-[15px] font-bold">Password required</div>
      </div>
      <p className="text-[13px]" style={{ color: "var(--editor-muted)" }}>
        Enter the password to view this tour.
      </p>
      <input
        type="password"
        className="editor-input"
        autoFocus
        autoComplete="current-password"
        aria-label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error ? (
        <div role="alert" className="text-[12px]" style={{ color: "var(--editor-crimson-2)" }}>
          {error}
        </div>
      ) : null}
      <EditorButton type="submit" variant="primary" disabled={!password || busy}>
        {busy ? "Checking…" : "View tour"}
      </EditorButton>
    </form>
  );
}
