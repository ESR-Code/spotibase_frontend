/**
 * Public viewer API: anonymous, same-origin `/gateway/public/*` (Worker
 * `worker/src/viewer.ts`). Never sends the session cookie.
 */

export type PublishedSnapshotResult =
  | { status: "ok"; version: number; passwordProtected: boolean; snapshot: unknown }
  | { status: "locked" }
  | { status: "not_found" }
  | { status: "error"; message: string };

const TOKEN_KEY = (projectId: string) => `spotibase:viewer:token:${projectId}`;

/** Unlock token for this tab (sessionStorage; memory-only when blocked). */
const memoryTokens = new Map<string, string>();

export function readViewerToken(projectId: string): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY(projectId)) ?? memoryTokens.get(projectId) ?? null;
  } catch {
    return memoryTokens.get(projectId) ?? null;
  }
}

function writeViewerToken(projectId: string, token: string | null) {
  if (token) memoryTokens.set(projectId, token);
  else memoryTokens.delete(projectId);
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY(projectId), token);
    else sessionStorage.removeItem(TOKEN_KEY(projectId));
  } catch {
    /* sandboxed iframe / blocked storage: memory only */
  }
}

export async function fetchPublishedSnapshot(
  projectId: string,
  token: string | null,
): Promise<PublishedSnapshotResult> {
  let response: Response;
  try {
    response = await fetch(`/gateway/public/projects/${encodeURIComponent(projectId)}/snapshot`, {
      credentials: "omit",
      headers: token ? { "x-viewer-token": token } : undefined,
    });
  } catch {
    return { status: "error", message: "The tour could not be reached. Check your connection." };
  }
  if (response.status === 404) return { status: "not_found" };
  if (response.status === 401) {
    // A stale / revoked token: forget it so the password prompt shows.
    if (token) writeViewerToken(projectId, null);
    return { status: "locked" };
  }
  if (!response.ok) {
    return {
      status: "error",
      message:
        response.status === 429
          ? "Too many requests. Wait a moment and reload."
          : `The tour could not be loaded (${response.status}).`,
    };
  }
  const body = (await response.json()) as {
    status: string;
    version?: number;
    passwordProtected?: boolean;
    snapshot?: unknown;
  };
  if (body.status !== "ok" || body.snapshot == null) return { status: "not_found" };
  return {
    status: "ok",
    version: body.version ?? 0,
    passwordProtected: !!body.passwordProtected,
    snapshot: body.snapshot,
  };
}

export type UnlockResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export async function unlockPublishedProject(
  projectId: string,
  password: string,
): Promise<UnlockResult> {
  let response: Response;
  try {
    response = await fetch(`/gateway/public/projects/${encodeURIComponent(projectId)}/unlock`, {
      method: "POST",
      credentials: "omit",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    return { ok: false, message: "The tour could not be reached. Check your connection." };
  }
  if (response.status === 429) {
    return { ok: false, message: "Too many attempts. Try again in a minute." };
  }
  if (!response.ok) return { ok: false, message: "Incorrect password." };
  const body = (await response.json()) as { token?: string };
  if (!body.token) return { ok: false, message: "Incorrect password." };
  writeViewerToken(projectId, body.token);
  return { ok: true, token: body.token };
}
