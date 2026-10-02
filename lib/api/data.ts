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
  const method = init?.method ?? "GET";
  if (method !== "GET" && method !== "HEAD" && !headers.has("Prefer")) {
    headers.set("Prefer", "return=minimal");
  }

  let res = await dataFetch(path, { ...init, headers });
  // Next dev sometimes answers 500 with "Manifest file is empty" while the
  // gateway route is compiling. A read can be repeated safely.
  if (!res.ok && method === "GET" && res.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    res = await dataFetch(path, { ...init, headers });
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as {
        message?: string;
        hint?: string;
        error?: string;
      };
      detail = body.message || body.hint || body.error || detail;
    } catch {
      /* ignore */
    }
    throw new DataApiError(detail || `Data API ${res.status}`, res.status);
  }
  if (res.status === 204 || res.status === 201) {
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
  return (await res.json()) as T;
}
