export function joinUrl(base: string, path: string, search = "") {
	const root = base.replace(/\/$/, "");
	const suffix = path.startsWith("/") ? path : `/${path}`;
	return `${root}${suffix}${search}`;
}

export function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reject expired JWTs. Opaque / undecodable tokens are left for the Data API. */
export function jwtUsable(token: string) {
	const payload = decodeJwtPayload(token);
	if (!payload) return true;
	return typeof payload.exp !== "number" || payload.exp * 1000 > Date.now();
}

function decodeJwtPayload(token: string) {
	const parts = token.split(".");
	if (parts.length < 2) return null;
	try {
		const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
		return JSON.parse(atob(padded)) as { exp?: unknown };
	} catch {
		return null;
	}
}

export function clientIp(request: Request) {
	return (
		request.headers.get("cf-connecting-ip") ??
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		"local"
	);
}

export function json(status: number, body: unknown, extra?: HeadersInit) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			...Object.fromEntries(new Headers(extra).entries()),
		},
	});
}

const SKIP_RESPONSE_HEADERS = new Set([
	"set-cookie",
	"content-encoding",
	"content-length",
	"access-control-allow-origin",
	"access-control-allow-credentials",
	"access-control-allow-headers",
	"access-control-allow-methods",
]);

export function rewriteSetCookie(cookie: string) {
	const parts = cookie
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean);
	const [nameValue, ...attrs] = parts;
	const kept = attrs.filter((part) => {
		const key = part.toLowerCase().split("=")[0];
		return key !== "domain" && key !== "path" && key !== "samesite" && key !== "partitioned";
	});
	return [nameValue, "Path=/", "SameSite=Lax", ...kept].join("; ");
}

export function corsHeaders(request: Request, appOrigin: string) {
	const origin = request.headers.get("origin");
	const headers = new Headers();
	if (origin && origin === appOrigin) {
		headers.set("access-control-allow-origin", origin);
		headers.set("access-control-allow-credentials", "true");
		headers.set("vary", "origin");
	}
	headers.set(
		"access-control-allow-headers",
		"content-type, authorization, accept, accept-profile, content-profile, prefer, x-upsert",
	);
	headers.set(
		"access-control-allow-methods",
		"GET, POST, PUT, PATCH, DELETE, OPTIONS",
	);
	return headers;
}

export function withCors(request: Request, appOrigin: string, response: Response) {
	const headers = new Headers(response.headers);
	for (const [key, value] of corsHeaders(request, appOrigin)) {
		headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export async function proxy(request: Request, target: string) {
	const headers = new Headers(request.headers);
	headers.delete("host");
	headers.delete("connection");
	headers.delete("forwarded");
	headers.delete("x-forwarded-host");
	headers.delete("x-forwarded-proto");
	headers.delete("x-forwarded-port");
	const upstream = await fetch(target, {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		duplex: "half",
		redirect: "manual",
	} as RequestInit);

	const headersOut = new Headers();
	upstream.headers.forEach((value, key) => {
		if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
			headersOut.append(key, value);
		}
	});
	for (const cookie of upstream.headers.getSetCookie()) {
		headersOut.append("set-cookie", rewriteSetCookie(cookie));
	}

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: headersOut,
	});
}
