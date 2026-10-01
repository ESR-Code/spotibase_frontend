import { env } from "cloudflare:workers";
import { clientIp, corsHeaders, joinUrl, json, proxy, withCors } from "./http";

const AUTH_WRITES = [
	"/sign-in/email",
	"/sign-up/email",
	"/request-password-reset",
	"/reset-password",
];

export default {
	async fetch(request) {
		const url = new URL(request.url);
		const { pathname } = url;

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request, env.APP_ORIGIN),
			});
		}

		if (pathname === "/health") {
			return withCors(request, env.APP_ORIGIN, json(200, { ok: true }));
		}

		try {
			if (pathname === "/auth" || pathname.startsWith("/auth/")) {
				return await handleAuth(request, url);
			}
			if (pathname === "/data" || pathname.startsWith("/data/")) {
				return await handleData(request, url);
			}
			if (pathname === "/fn" || pathname.startsWith("/fn/")) {
				return await handleFunction(request, url);
			}
		} catch (error) {
			console.error(error);
			return withCors(
				request,
				env.APP_ORIGIN,
				json(502, { error: "Upstream request failed." }),
			);
		}

		return withCors(request, env.APP_ORIGIN, json(404, { error: "Not found." }));
	},
} satisfies ExportedHandler;

async function limited(limiter: RateLimit, key: string) {
	const { success } = await limiter.limit({ key });
	return success;
}

async function handleAuth(request: Request, url: URL) {
	const path = url.pathname.slice("/auth".length) || "/";
	if (
		request.method === "POST" &&
		AUTH_WRITES.some((suffix) => path === suffix || path.endsWith(suffix))
	) {
		const allowed = await limited(env.AUTH_RATE_LIMIT, clientIp(request));
		if (!allowed) {
			return withCors(
				request,
				env.APP_ORIGIN,
				json(429, { error: "Too many requests." }),
			);
		}
	}

	const origin = request.headers.get("origin") ?? env.APP_ORIGIN;
	const headers = new Headers(request.headers);
	headers.set("origin", origin);
	const proxied = new Request(request, { headers });
	const target = joinUrl(env.NEON_AUTH_BASE_URL, path, url.search);
	return withCors(proxied, env.APP_ORIGIN, await proxy(proxied, target));
}

function blockedDataPath(request: Request, path: string) {
	const lower = path.toLowerCase();
	if (lower.includes("..") || lower.includes("neon_auth")) return true;
	const profile = `${request.headers.get("accept-profile") ?? ""} ${request.headers.get("content-profile") ?? ""}`;
	return profile.toLowerCase().includes("neon_auth");
}

async function handleData(request: Request, url: URL) {
	const path = url.pathname.slice("/data".length) || "/";
	if (blockedDataPath(request, path)) {
		return withCors(request, env.APP_ORIGIN, json(403, { error: "Forbidden." }));
	}

	const allowed = await limited(env.DATA_RATE_LIMIT, clientIp(request));
	if (!allowed) {
		return withCors(request, env.APP_ORIGIN, json(429, { error: "Too many requests." }));
	}

	const token = await userJwt(request);
	if (!token) {
		return withCors(request, env.APP_ORIGIN, json(401, { error: "Unauthorized." }));
	}

	const headers = new Headers(request.headers);
	headers.set("authorization", `Bearer ${token}`);
	headers.delete("cookie");
	headers.delete("apikey");
	const proxied = new Request(request, { headers });
	const target = joinUrl(env.NEON_DATA_API_URL, path, url.search);
	return withCors(proxied, env.APP_ORIGIN, await proxy(proxied, target));
}

async function userJwt(request: Request) {
	const cookie = request.headers.get("cookie");
	if (!cookie) return null;
	const response = await fetch(joinUrl(env.NEON_AUTH_BASE_URL, "/token"), {
		headers: {
			cookie,
			origin: request.headers.get("origin") ?? env.APP_ORIGIN,
		},
	});
	if (!response.ok) return null;
	const body = (await response.json()) as { token?: string };
	return body.token || null;
}

async function handleFunction(request: Request, url: URL) {
	const upstream = env.NEON_FUNCTION_URL.trim();
	if (!upstream) {
		return withCors(
			request,
			env.APP_ORIGIN,
			json(501, { error: "Neon Function is not configured." }),
		);
	}
	const path = url.pathname.slice("/fn".length) || "/";
	return withCors(
		request,
		env.APP_ORIGIN,
		await proxy(request, joinUrl(upstream, path, url.search)),
	);
}
