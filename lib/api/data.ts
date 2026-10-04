function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dataFetch(path: string, init?: RequestInit) {
  const suffix = path.replace(/^\//, "");
  return fetch(`/gateway/data/${suffix}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
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

  const fetchOnce = () => dataFetch(path, { ...init, headers });
  let res = await fetchOnce();
  // 401: session cookie / JWT can be mid-refresh after a tab switch.
  // 5xx: Next dev sometimes answers "Manifest file is empty" while the
  // gateway route is compiling. Reads can be repeated safely.
  if (method === "GET" && (res.status === 401 || res.status >= 500)) {
    await wait(400);
    res = await fetchOnce();
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

  let data = (await res.json()) as T;
  // RLS returns [] when auth.user_id() is briefly unset. Retry once on
  // product-table reads so a tab-switch race does not look like an empty org.
  if (
    method === "GET" &&
    Array.isArray(data) &&
    data.length === 0 &&
    /^(projects|project_folders)(\?|$)/.test(path)
  ) {
    await wait(400);
    res = await fetchOnce();
    if (res.ok) data = (await res.json()) as T;
  }
  return data;
}
