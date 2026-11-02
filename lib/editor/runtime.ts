/**
 * Which app is running the editor runtime: the authoring editor (default) or
 * the public viewer (`/view/<projectId>`). Set once at viewer boot, before the
 * project is hydrated; never toggled back.
 *
 * Use it only where the shared Preview runtime must behave differently in the
 * viewer (anonymous file URLs, session-backed "show once", editor-only chrome).
 * Preview behaviour itself stays gated on `useEditorStore.isPreview`.
 */
type ViewerRuntime = {
  projectId: string;
  /** Unlock token for password-protected projects (`?vt=` on file URLs). */
  token: string | null;
};

let viewer: ViewerRuntime | null = null;

export function setViewerRuntime(next: ViewerRuntime): void {
  viewer = { ...next };
}

export function isViewerRuntime(): boolean {
  return viewer !== null;
}

export function viewerRuntime(): Readonly<ViewerRuntime> | null {
  return viewer;
}
