"use client";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  hasUnsavedChanges,
  saveProject,
  useProjectPersistStore,
} from "@/lib/editor/persist/persist-store";
import { serializeProject } from "@/lib/editor/persist/serialize";

type Props = { projectId: string; children: ReactNode };
type State = {
  error: Error | null;
  saving: boolean;
  saved: boolean;
  note: string | null;
};

const INITIAL: State = { error: null, saving: false, saved: false, note: null };

/**
 * A render error would otherwise unmount the editor and drop the in-memory
 * project. The stores outlive this boundary (they are owned by the loader), so
 * the author can save, download a backup, or retry from here.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = INITIAL;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[editor] render error", error, info.componentStack);
  }

  private retry = () => this.setState(INITIAL);

  private save = async () => {
    this.setState({ saving: true, note: null });
    try {
      const ok = await saveProject();
      this.setState({
        saving: false,
        saved: ok,
        note: ok ? null : "Save did not complete. Download a backup instead.",
      });
    } catch {
      this.setState({
        saving: false,
        note: "Save failed. Download a backup instead.",
      });
    }
  };

  private downloadBackup = () => {
    try {
      const json = JSON.stringify(serializeProject(), null, 2);
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `spotibase-backup-${this.props.projectId}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.setState({ note: "The project state could not be read for a backup." });
    }
  };

  render() {
    const { error, saving, saved, note } = this.state;
    if (!error) return this.props.children;

    const unsaved =
      !saved && useProjectPersistStore.getState().projectId != null
        ? hasUnsavedChanges()
        : false;
    const button =
      "rounded-md border border-white/15 px-3 py-1.5 text-[13px] disabled:opacity-50";

    return (
      <div
        role="alert"
        className="editor-root flex h-full min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ background: "#0b1424", color: "#eef1f8" }}
      >
        <div className="text-[15px] font-bold">The editor hit an error</div>
        <div className="max-w-md text-[13px]" style={{ color: "#8a98b8" }}>
          {unsaved
            ? "Your edits are still in memory. Save or download a backup before doing anything else."
            : saved
              ? "Your changes were saved."
              : "No unsaved changes were detected."}
        </div>
        <div
          className="max-w-md break-words text-[12px]"
          style={{ color: "#8a98b8" }}
        >
          {error.message}
        </div>
        {note ? (
          <div className="text-[12px]" style={{ color: "#f0a0a0" }}>
            {note}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className={button}
            disabled={saving}
            onClick={() => void this.save()}
          >
            {saving ? "Saving…" : "Save now"}
          </button>
          <button type="button" className={button} onClick={this.downloadBackup}>
            Download backup
          </button>
          <button type="button" className={button} onClick={this.retry}>
            Try again
          </button>
          <Link href={`/projects/${this.props.projectId}`} className={button}>
            Back to project
          </Link>
        </div>
      </div>
    );
  }
}
