import { isViewerRuntime, viewerRuntime } from "@/lib/editor/runtime";

/**
 * Scene dialogs already shown in this Preview session (for "Show once per
 * session"). Module-level, not authored: in the editor, entering or leaving
 * Preview resets it. In the public viewer it is backed by `sessionStorage`
 * (per project), so a reload in the same tab does not show the dialog again.
 */
const shownDialogIds = new Set<string>();
let restored = false;

function storageKey(): string | null {
  const viewer = viewerRuntime();
  return viewer ? `spotibase:viewer:shown-dialogs:${viewer.projectId}` : null;
}

function restore(): void {
  if (restored) return;
  restored = true;
  const key = storageKey();
  if (!key) return;
  try {
    const raw = sessionStorage.getItem(key);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(ids)) {
      for (const id of ids) if (typeof id === "string") shownDialogIds.add(id);
    }
  } catch {
    /* storage blocked (private mode / sandboxed iframe): memory only */
  }
}

export function wasSceneDialogShown(id: string): boolean {
  restore();
  return shownDialogIds.has(id);
}

export function markSceneDialogShown(id: string): void {
  restore();
  shownDialogIds.add(id);
  const key = storageKey();
  if (!key) return;
  try {
    sessionStorage.setItem(key, JSON.stringify([...shownDialogIds]));
  } catch {
    /* memory only */
  }
}

export function resetSceneDialogSession(): void {
  // The viewer enters Preview once per page load; its session is the tab.
  if (isViewerRuntime()) return;
  shownDialogIds.clear();
}
