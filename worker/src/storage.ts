import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";
import { joinUrl, json } from "./http";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`, "i");
const PROJECT_KEY_RE = new RegExp(`^orgs/(${UUID})/projects/(${UUID})/(.+)$`, "i");
const THUMBNAIL_FILE_RE = new RegExp(`^thumbnails/${UUID}\\.webp$`, "i");

const THUMBNAIL_TYPE = "image/webp";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 300;

type ProjectAccess = {
	id: string;
	organization_id: string;
	thumbnail_r2_key: string | null;
};

export const assetKey = {
	projectRoot: (orgId: string, projectId: string) =>
		`orgs/${orgId}/projects/${projectId}/`,
	projectThumbnail: (orgId: string, projectId: string) =>
		`${assetKey.projectRoot(orgId, projectId)}thumbnails/${crypto.randomUUID()}.webp`,
};

function dataApi(token: string, path: string, init?: RequestInit) {
	const headers = new Headers(init?.headers);
	headers.set("authorization", `Bearer ${token}`);
	headers.set("accept", "application/json");
	if (init?.body) headers.set("content-type", "application/json");
	const [pathname, search = ""] = path.split("?");
	return fetch(
		joinUrl(env.NEON_DATA_API_URL, pathname, search ? `?${search}` : ""),
		{ ...init, headers },
	);
}

/** Returns the project row only when RLS lets this user see it (org member). */
async function projectAccess(token: string, projectId: string) {
	if (!UUID_RE.test(projectId)) return null;
	const q = new URLSearchParams({
		id: `eq.${projectId}`,
		select: "id,organization_id,thumbnail_r2_key",
	});
	const response = await dataApi(token, `/projects?${q}`);
	if (!response.ok) return null;
	const rows = (await response.json()) as ProjectAccess[];
	return rows[0] ?? null;
}

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

async function presignPut(key: string, contentType: string) {
	const client = new AwsClient({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		service: "s3",
		region: "auto",
	});
	const url = new URL(
		`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`,
	);
	url.searchParams.set("X-Amz-Expires", String(UPLOAD_TTL_SECONDS));
	const signed = await client.sign(
		new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
		{ aws: { signQuery: true, allHeaders: true } },
	);
	return signed.url;
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
	try {
		return (await request.json()) as Partial<T>;
	} catch {
		return {};
	}
}

async function deleteObject(key: string | null | undefined) {
	if (!key) return;
	try {
		await env.ASSETS.delete(key);
	} catch (error) {
		console.error("R2 delete failed", key, error);
	}
}

function isThumbnailKey(project: ProjectAccess, key: unknown): key is string {
	const prefix = assetKey.projectRoot(project.organization_id, project.id);
	return (
		typeof key === "string" &&
		key.startsWith(prefix) &&
		THUMBNAIL_FILE_RE.test(key.slice(prefix.length))
	);
}

/** Without S3 credentials (local dev), uploads go through the Worker into the simulated bucket. */
function directUploadEnabled() {
	return !env.R2_ACCESS_KEY_ID?.trim() || !env.R2_SECRET_ACCESS_KEY?.trim();
}

/** `/storage/projects/:id/thumbnail[/upload-url|/upload|/commit]` */
export async function handleStorage(request: Request, path: string, token: string) {
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

	if (!("body" in object) || request.method === "HEAD") {
		const status = "body" in object ? 200 : 304;
		return new Response(null, { status, headers });
	}
	headers.set("content-length", String(object.size));
	return new Response(object.body, { headers });
}
