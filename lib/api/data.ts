export async function dataFetch(path: string, init?: RequestInit) {
  const suffix = path.replace(/^\//, "");
  return fetch(`/gateway/data/${suffix}`, {
    ...init,
    credentials: "include",
  });
}
