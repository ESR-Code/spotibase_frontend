export async function dataFetch(path: string, init?: RequestInit) {
  const suffix = path.replace(/^\//, "");
  return fetch(`/gateway/data/${suffix}`, {
    ...init,
    credentials: "include",
  });
}

export class DataApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DataApiError";
    this.status = status;
  }
}

export async function dataJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (init?.method && init.method !== "GET" && !headers.has("Prefer")) {
    headers.set("Prefer", "return=representation");
  }

  const res = await dataFetch(path, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string; hint?: string };
      detail = body.message || body.hint || detail;
    } catch {
      /* ignore */
    }
    throw new DataApiError(detail || `Data API ${res.status}`, res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
