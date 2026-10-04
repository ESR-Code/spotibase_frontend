import { env } from "cloudflare:workers";
import { handleAssets } from "./assets";
import { json } from "./http";
import {
	assetKey,
	dataApi,
	deleteObject,
	directUploadEnabled,
	presignPut,
	type ProjectAccess,
	projectAccess,
	readJson,
	UPLOAD_TTL_SECONDS,
	UUID,
} from "./storage-common";

const PROJECT_KEY_RE = new RegExp(`^orgs/(${UUID})/projects/(${UUID})/(.+)$`, "i");
const THUMBNAIL_FILE_RE = new RegExp(`^thumbnails/${UUID}\\.webp$`, "i");

const THUMBNAIL_TYPE = "image/webp";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

async function setThumbnailKey(
	token: string,
	projectId: string,
	key: string | null,
): Promise<{ row: unknown } | { error: string }> {
	const response = await dataApi(token, `/projects?id=eq.${projectId}`, {
		method: "PATCH",
		headers: { prefer: "return=representation" },
		body: JSON.stringify({
			thumbnail_r2_key: key,
			updated_at: new Date().toISOString(),
		}),
	});
	if (!response.ok) {
		const text = await response.text();
		console.error("Data API PATCH projects failed", response.status, text);
		let message = `Data API ${response.status}`;
		try {
			message = (JSON.parse(text) as { message?: string }).message || message;
		} catch {
			/* not JSON */
		}
		return { error: `Could not update the project: ${message}` };
	}
	const rows = (await response.json()) as unknown[];
	if (!rows[0]) return { error: "Could not update the project: no row was updated." };
	return { row: rows[0] };
}

function isThumbnailKey(project: ProjectAccess, key: unknown): key is string {
	const prefix = assetKey.projectRoot(project.organization_id, project.id);
	return (
		typeof key === "string" &&
		key.startsWith(prefix) &&
		THUMBNAIL_FILE_RE.test(key.slice(prefix.length))
	);
}

/**
 * `/storage/projects/:id/thumbnail[/upload-url|/upload|/commit]`
 * `/storage/projects/:id/assets/...` (see `assets.ts`)
 */
export async function handleStorage(request: Request, path: string, token: string) {
	const assetMatch = path.match(/^\/projects\/([^/]+)\/assets(\/.*)?$/);
	if (assetMatch) {
		const project = await projectAccess(token, assetMatch[1]);
		if (!project) return json(404, { error: "Project not found." });
		return handleAssets(request, assetMatch[2] ?? "", project, token);
	}

	const match = path.match(
		/^\/projects\/([^/]+)\/thumbnail(\/upload-url|\/upload|\/commit)?$/,
	);
	if (!match) return json(404, { error: "Not found." });
	const [, projectId, action = ""] = match;

	const project = await projectAccess(token, projectId);
	if (!project) return json(404, { error: "Project not found." });

	if (action === "/upload-url" && request.method === "POST") {
		const key = assetKey.projectThumbnail(project.organization_id, project.id);
		const url = directUploadEnabled()
			? `/gateway/storage/projects/${project.id}/thumbnail/upload?key=${encodeURIComponent(key)}`
			: await presignPut(key, THUMBNAIL_TYPE);
		return json(200, {
			key,
			url,
			method: "PUT",
			headers: { "content-type": THUMBNAIL_TYPE },
			expiresIn: UPLOAD_TTL_SECONDS,
		});
	}

	if (action === "/upload" && request.method === "PUT") {
		if (!directUploadEnabled()) return json(404, { error: "Not found." });
		const key = new URL(request.url).searchParams.get("key");
		if (!isThumbnailKey(project, key)) {
			return json(400, { error: "Invalid thumbnail key." });
		}
		if (request.headers.get("content-type") !== THUMBNAIL_TYPE) {
			return json(415, { error: "Thumbnail must be a WebP image." });
		}
		const body = await request.arrayBuffer();
		if (body.byteLength > MAX_THUMBNAIL_BYTES) {
			return json(413, { error: "Thumbnail must be 5 MB or smaller." });
		}
		await env.ASSETS.put(key, body, { httpMetadata: { contentType: THUMBNAIL_TYPE } });
		return json(200, { ok: true });
	}

	if (action === "/commit" && request.method === "POST") {
		const { key } = await readJson<{ key: string }>(request);
		if (!isThumbnailKey(project, key)) {
			return json(400, { error: "Invalid thumbnail key." });
		}

		const head = await env.ASSETS.head(key);
		if (!head) return json(400, { error: "Upload not found." });
		if (
			head.size > MAX_THUMBNAIL_BYTES ||
			head.httpMetadata?.contentType !== THUMBNAIL_TYPE
		) {
			await deleteObject(key);
			return json(400, { error: "Thumbnail must be a WebP image up to 5 MB." });
		}

		const result = await setThumbnailKey(token, project.id, key);
		if ("error" in result) {
			await deleteObject(key);
			return json(403, { error: result.error });
		}
		if (project.thumbnail_r2_key !== key) {
			await deleteObject(project.thumbnail_r2_key);
		}
		return json(200, result.row);
	}

	if (action === "" && request.method === "DELETE") {
		if (!project.thumbnail_r2_key) return json(200, { ok: true });
		const result = await setThumbnailKey(token, project.id, null);
		if ("error" in result) return json(403, { error: result.error });
		await deleteObject(project.thumbnail_r2_key);
		return json(200, result.row);
	}

	return json(405, { error: "Method not allowed." });
}

/** `/files/orgs/:org/projects/:project/...` streamed from the private bucket. */
export async function handleFiles(request: Request, path: string, token: string) {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return json(405, { error: "Method not allowed." });
	}
	const key = decodeURIComponent(path.replace(/^\//, ""));
	const match = key.match(PROJECT_KEY_RE);
	if (!match || key.includes("..") || key.includes("//")) {
		return json(404, { error: "Not found." });
	}
	const [, orgId, projectId] = match;

	const project = await projectAccess(token, projectId);
	if (!project || project.organization_id.toLowerCase() !== orgId.toLowerCase()) {
		return json(404, { error: "Not found." });
	}

	const object = await env.ASSETS.get(key, { onlyIf: request.headers });
	if (!object) return json(404, { error: "Not found." });

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	// Keys are unique per upload, so the bytes behind a key never change.
	headers.set("cache-control", "private, max-age=31536000, immutable");
	// Files are served from the app origin; uploaded SVG/HTML must never run script.
	headers.set("x-content-type-options", "nosniff");
	headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");

	if (!("body" in object) || request.method === "HEAD") {
		const status = "body" in object ? 200 : 304;
		return new Response(null, { status, headers });
	}
	headers.set("content-length", String(object.size));
	return new Response(object.body, { headers });
}
