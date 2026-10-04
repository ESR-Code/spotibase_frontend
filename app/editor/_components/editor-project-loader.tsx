"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EditorApp } from "@/app/editor/_components/editor-app";
import { loadEditorProject } from "@/lib/editor/persist/api";
import { hydrateProject } from "@/lib/editor/persist/hydrate";
import {
  bindPersistedProject,
  unbindPersistedProject,
} from "@/lib/editor/persist/persist-store";

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "not-found" }
  | { status: "error"; message: string };

/** Loads the project from the DB into the editor stores, then mounts the editor. */
export function EditorProjectLoader({ projectId }: { projectId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadEditorProject(projectId)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setState({ status: "not-found" });
          return;
        }
        hydrateProject({
          projectId,
          editorData: loaded.project.editor_data,
          sceneRows: loaded.sceneRows,
          assets: loaded.assets,
        });
        bindPersistedProject({
          projectId,
          projectName: loaded.project.name,
          revision: loaded.project.editor_revision,
        });
        setState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load the project.",
        });
      });
    return () => {
      cancelled = true;
      unbindPersistedProject();
    };
  }, [projectId, attempt]);

  if (state.status === "ready") return <EditorApp />;

  return (
    <div
      className="editor-root flex h-full min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ background: "#0b1424", color: "#eef1f8" }}
    >
      {state.status === "loading" ? (
        <span>Loading project…</span>
      ) : (
        <>
          <div className="text-[15px] font-bold">
            {state.status === "not-found" ? "Project not found" : "The project could not be loaded"}
          </div>
          <div className="max-w-md text-[13px]" style={{ color: "#8a98b8" }}>
            {state.status === "not-found"
              ? "It may have been deleted, or you are not a member of its organization."
              : state.message}
          </div>
          <div className="mt-2 flex gap-2">
            {state.status === "error" ? (
              <button
                type="button"
                className="rounded-md border border-white/15 px-3 py-1.5 text-[13px]"
                onClick={() => {
                  setState({ status: "loading" });
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
            ) : null}
            <Link
              href={state.status === "not-found" ? "/projects" : `/projects/${projectId}`}
              className="rounded-md border border-white/15 px-3 py-1.5 text-[13px]"
            >
              Back
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
