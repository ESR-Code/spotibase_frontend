import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const workerBase = (process.env.WORKER_URL ?? "http://127.0.0.1:8787").replace(
  /\/$/,
  "",
);

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyToWorker(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const suffix = path.join("/");
  const target = `${workerBase}/${suffix}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.set(
    "origin",
    request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  );

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "set-cookie" ||
        lower === "transfer-encoding" ||
        lower === "content-encoding"
      ) {
        return;
      }
      out.append(key, value);
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      out.append("set-cookie", cookie);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out,
    });
  } catch {
    if (request.method === "GET" && suffix === "auth/get-session") {
      return Response.json(null, { status: 200 });
    }
    return Response.json({ error: "API unavailable" }, { status: 503 });
  }
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}

export function HEAD(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}

export function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyToWorker(request, context);
}
