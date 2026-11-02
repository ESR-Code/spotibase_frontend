import { env } from "cloudflare:workers";
import { neon } from "@neondatabase/serverless";
import { ASSET_FILE_RE } from "./assets";
import { clientIp, json } from "./http";
import { PROJECT_KEY_RE, serveR2Object } from "./storage";
import { readJson, UUID_RE } from "./storage-common";

/**
 * Public viewer routes (`/public/*`). No cookie, no user JWT: these read only
 * the live published snapshot through SECURITY DEFINER functions (migration
 * 0009), connecting as the execute-only `spotibase_viewer` role.
 *
 * Password-protected projects need an unlock token (from POST …/unlock) as the
 * `x-viewer-token` header (snapshot) or `?vt=` (files, since <img> / textures
 * cannot send headers). The token is returned in JSON, not a cookie, because
 * third-party iframes drop SameSite=Lax cookies.
 */

const SNAPSHOT_RE = /^\/projects\/([^/]+)\/snapshot$/;
const UNLOCK_RE = /^\/projects\/([^/]+)\/unlock$/;
const TOKEN_RE = /^[0-9a-f]{48}$/;
/** Edge cache for unprotected answers; never holds token-specific results. */
const CACHE_ORIGIN = "https://viewer-cache.spotibase.internal";
const SNAPSHOT_EDGE_TTL = 60;
const ASSET_CHECK_TTL = 60;
/** What browsers / shared caches see for an unprotected snapshot. */
const PUBLIC_SNAPSHOT_CACHE = `public, max-age=0, s-maxage=${SNAPSHOT_EDGE_TTL}, stale-while-revalidate=300`;

type SnapshotResult =
	| { status: "not_found" }
	| { status: "locked"; passwordProtected: true }
	| { status: "ok"; version: number; passwordProtected: boolean; snapshot: unknown };

type AssetCheck = { ok: boolean; passwordProtected: boolean };

function viewerSql() {
	const url = env.VIEWER_DATABASE_URL?.trim();
	return url ? neon(url) : null;
}

async function limited(limiter: RateLimit, key: string) {
	const { success } = await limiter.limit({ key });
	return !success;
}

function readToken(value: string | null) {
	return value && TOKEN_RE.test(value) ? value : null;
}

export async function handlePublic(request: Request, url: URL) {
	const path = url.pathname.slice("/public".length);
	const sql = viewerSql();
	if (!sql) return json(503, { error: "The viewer is not configured." });

	const snapshot = path.match(SNAPSHOT_RE);
	if (snapshot) return getSnapshot(request, sql, snapshot[1]);

	const unlock = path.match(UNLOCK_RE);
	if (unlock) return unlockProject(request, sql, unlock[1]);

	if (path.startsWith("/files/")) {
		return getFile(request, sql, path.slice("/files/".length), url);
	}
	return json(404, { error: "Not found." });
}

async function getSnapshot(
	request: Request,
	sql: NonNullable<ReturnType<typeof viewerSql>>,
	projectId: string,
) {
	if (request.method !== "GET") return json(405, { error: "Method not allowed." });
	if (!UUID_RE.test(projectId)) return json(404, { status: "not_found" });
	if (await limited(env.VIEWER_RATE_LIMIT, `snap:${clientIp(request)}`)) {
		return json(429, { error: "Too many requests." });
	}

	const token = readToken(request.headers.get("x-viewer-token"));
	const cacheKey = new Request(`${CACHE_ORIGIN}/snapshot/${projectId.toLowerCase()}`);
	if (!token) {
		const cached = await caches.default.match(cacheKey);
		if (cached) {
			// The stored copy carries the edge TTL; browsers get the public header.
			const headers = new Headers(cached.headers);
			headers.set("cache-control", PUBLIC_SNAPSHOT_CACHE);
			return new Response(cached.body, { status: 200, headers });
		}
	}

	const rows = (await sql`select public.get_published_snapshot(${projectId}::uuid, ${token}) as r`) as {
		r: SnapshotResult;
	}[];
	const result = rows[0]?.r ?? { status: "not_found" };

	if (result.status === "not_found") {
		return json(404, result, { "cache-control": "no-store" });
	}
	if (result.status === "locked") {
		return json(401, result, { "cache-control": "no-store" });
	}
	if (result.passwordProtected) {
		return json(200, result, { "cache-control": "private, no-store" });
	}
	// Browsers revalidate every load; the edge copy makes a new publish show
	// up within a minute.
	const response = json(200, result, { "cache-control": PUBLIC_SNAPSHOT_CACHE });
	await caches.default.put(
		cacheKey,
		json(200, result, { "cache-control": `public, max-age=${SNAPSHOT_EDGE_TTL}` }),
	);
	return response;
}

async function unlockProject(
	request: Request,
	sql: NonNullable<ReturnType<typeof viewerSql>>,
	projectId: string,
) {
	if (request.method !== "POST") return json(405, { error: "Method not allowed." });
	if (!UUID_RE.test(projectId)) return json(404, { error: "Not found." });
	if (await limited(env.VIEWER_UNLOCK_RATE_LIMIT, `unlock:${clientIp(request)}:${projectId}`)) {
		return json(429, { error: "Too many attempts. Try again in a minute." });
	}
	const body = await readJson<{ password: string }>(request);
	const password = typeof body.password === "string" ? body.password : "";
	if (!password || password.length > 200) {
		return json(401, { error: "Incorrect password." });
	}
	const rows = (await sql`select public.unlock_published_project(${projectId}::uuid, ${password}) as token`) as {
		token: string | null;
	}[];
	const token = rows[0]?.token;
	if (!token) return json(401, { error: "Incorrect password." });
	return json(200, { token }, { "cache-control": "no-store" });
}

async function getFile(
	request: Request,
	sql: NonNullable<ReturnType<typeof viewerSql>>,
	rawKey: string,
	url: URL,
) {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return json(405, { error: "Method not allowed." });
	}
	if (await limited(env.VIEWER_FILES_RATE_LIMIT, `files:${clientIp(request)}`)) {
		return json(429, { error: "Too many requests." });
	}
	const key = decodeURIComponent(rawKey);
	if (key.includes("..") || key.includes("//")) return json(404, { error: "Not found." });
	const match = key.match(PROJECT_KEY_RE);
	if (!match) return json(404, { error: "Not found." });
	const [, , projectId, rest] = match;
	if (!rest.startsWith("assets/")) return json(404, { error: "Not found." });
	const assetId = rest.slice("assets/".length).match(ASSET_FILE_RE)?.[1];
	if (!assetId) return json(404, { error: "Not found." });

	const token = readToken(url.searchParams.get("vt"));
	const check = await checkAsset(sql, projectId, assetId, token);
	if (!check.ok) {
		return check.passwordProtected
			? json(401, { error: "Locked." })
			: json(404, { error: "Not found." });
	}
	// The key (org/project/asset id) is pinned by the regex above, and the asset
	// is listed in the live version, so the R2 key belongs to this project.
	return serveR2Object(
		request,
		key,
		check.passwordProtected
			? "private, max-age=3600"
			: "public, max-age=31536000, immutable",
	);
}

async function checkAsset(
	sql: NonNullable<ReturnType<typeof viewerSql>>,
	projectId: string,
	assetId: string,
	token: string | null,
): Promise<AssetCheck> {
	const cacheKey = new Request(
		`${CACHE_ORIGIN}/asset/${projectId.toLowerCase()}/${assetId.toLowerCase()}`,
	);
	if (!token) {
		const cached = await caches.default.match(cacheKey);
		if (cached) return (await cached.json()) as AssetCheck;
	}
	const rows = (await sql`select public.is_published_asset(${projectId}::uuid, ${assetId}::uuid, ${token}) as r`) as {
		r: AssetCheck;
	}[];
	const result = rows[0]?.r ?? { ok: false, passwordProtected: false };
	if (!token && result.ok && !result.passwordProtected) {
		await caches.default.put(
			cacheKey,
			json(200, result, { "cache-control": `public, max-age=${ASSET_CHECK_TTL}` }),
		);
	}
	return result;
}
