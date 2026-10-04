import { env } from "cloudflare:workers";
import { json } from "./http";
import {
	assetKey,
	dataApi,
	deleteObject,
	directUploadEnabled,
	presignPut,
	type ProjectAccess,
	readJson,
	UPLOAD_TTL_SECONDS,
	UUID,
	UUID_RE,
} from "./storage-common";

type AssetKind = "model" | "image";

type AssetRow = {
	id: string;
	organization_id: string;
	project_id: string;
	kind: AssetKind;
	status: "pending" | "ready";
	r2_key: string;
	content_type: string;
	size: number;
};

type UploadRequest = {
	kind: string;
	filename: string;
	contentType: string;
	size: number;
	name: string;
	sha256: string;
	sceneId: string;
	width: number;
	height: number;
};

const MB = 1024 * 1024;

/** Per-kind allowlist: content type → extension, plus the size cap. */
const ASSET_RULES: Record<AssetKind, { types: Record<string, string>; maxBytes: number }> = {
	model: {
		types: { "model/gltf-binary": "glb" },
		maxBytes: 100 * MB,
	},
	image: {
		types: {
			"image/png": "png",
			"image/jpeg": "jpg",
			"image/webp": "webp",
			"image/gif": "gif",
			"image/svg+xml": "svg",
		},
		maxBytes: 25 * MB,
	},
};

const SHA256_RE = /^[0-9a-f]{64}$/;
const ASSET_FILE_RE = new RegExp(`^(${UUID})\\.([a-z0-9]+)$`, "i");

function isAssetKind(value: unknown): value is AssetKind {
	return value === "model" || value === "image";
}

function cleanText(value: unknown, max: number) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveInt(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

async function dataError(response: Response, fallback: string) {
	const text = await response.text();
	console.error(fallback, response.status, text);
	try {
		return (JSON.parse(text) as { message?: string }).message || fallback;
	} catch {
		return fallback;
	}
}

async function findAsset(token: string, projectId: string, filter: Record<string, string>) {
	const q = new URLSearchParams({ project_id: `eq.${projectId}`, select: "*", ...filter });
	const response = await dataApi(token, `/assets?${q}`);
	if (!response.ok) return null;
	const rows = (await response.json()) as AssetRow[];
	return rows[0] ?? null;
}

async function patchAsset(token: string, assetId: string, body: Record<string, unknown>) {
	return dataApi(token, `/assets?id=eq.${assetId}`, {
		method: "PATCH",
		headers: { prefer: "return=representation" },
		body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
	});
}

function uploadTicket(project: ProjectAccess, key: string, contentType: string) {
	if (directUploadEnabled()) {
		return {
			url: `/gateway/storage/projects/${project.id}/assets/upload?key=${encodeURIComponent(key)}`,
			method: "PUT" as const,
			headers: { "content-type": contentType },
			expiresIn: UPLOAD_TTL_SECONDS,
		};
	}
	return presignPut(key, contentType).then((url) => ({
		url,
		method: "PUT" as const,
		headers: { "content-type": contentType },
		expiresIn: UPLOAD_TTL_SECONDS,
	}));
}

/** Resolves an asset key back to its id when it belongs to this project. */
function assetIdFromKey(project: ProjectAccess, key: unknown) {
	if (typeof key !== "string") return null;
	const prefix = assetKey.projectAssets(project.organization_id, project.id);
	if (!key.startsWith(prefix)) return null;
	return key.slice(prefix.length).match(ASSET_FILE_RE)?.[1] ?? null;
}

/**
 * `/storage/projects/:id/assets` sub-routes:
 * - `POST /upload-url` reserve a pending row (or reuse one with the same sha256)
 * - `PUT /upload?key=` local-dev direct upload into the simulated bucket
 * - `POST /:assetId/commit` validate the object and mark the row ready
 * - `DELETE /:assetId` drop the row and the object
 * - `DELETE ""` remove every asset object (project delete; rows cascade)
 */
export async function handleAssets(
	request: Request,
	path: string,
	project: ProjectAccess,
	token: string,
) {
	if (path === "/upload-url" && request.method === "POST") {
		return createUpload(request, project, token);
	}

	if (path === "/upload" && request.method === "PUT") {
		if (!directUploadEnabled()) return json(404, { error: "Not found." });
		const key = new URL(request.url).searchParams.get("key");
		const assetId = assetIdFromKey(project, key);
		if (!assetId || !key) return json(400, { error: "Invalid asset key." });
		const row = await findAsset(token, project.id, { id: `eq.${assetId}` });
		if (!row || row.r2_key !== key) return json(404, { error: "Asset not found." });
		if (request.headers.get("content-type") !== row.content_type) {
			return json(415, { error: "Content type does not match the asset." });
		}
		const body = await request.arrayBuffer();
		if (body.byteLength > ASSET_RULES[row.kind].maxBytes) {
			return json(413, { error: "File is too large." });
		}
		await env.ASSETS.put(key, body, { httpMetadata: { contentType: row.content_type } });
		return json(200, { ok: true });
	}

	if (path === "" && request.method === "DELETE") {
		const prefix = assetKey.projectAssets(project.organization_id, project.id);
		let cursor: string | undefined;
		do {
			const page = await env.ASSETS.list({ prefix, cursor });
			if (page.objects.length > 0) {
				await env.ASSETS.delete(page.objects.map((object) => object.key));
			}
			cursor = page.truncated ? page.cursor : undefined;
		} while (cursor);
		return json(200, { ok: true });
	}

	const itemMatch = path.match(/^\/([^/]+)(\/commit)?$/);
	if (itemMatch && UUID_RE.test(itemMatch[1])) {
		const [, assetId, action = ""] = itemMatch;
		const row = await findAsset(token, project.id, { id: `eq.${assetId}` });
		if (!row) return json(404, { error: "Asset not found." });

		if (action === "/commit" && request.method === "POST") {
			return commitUpload(request, row, token);
		}
		if (action === "" && request.method === "DELETE") {
			const response = await dataApi(token, `/assets?id=eq.${row.id}`, { method: "DELETE" });
			if (!response.ok) {
				return json(403, { error: await dataError(response, "Could not delete the asset.") });
			}
			await deleteObject(row.r2_key);
			return json(200, { ok: true });
		}
	}

	return json(405, { error: "Method not allowed." });
}

async function createUpload(request: Request, project: ProjectAccess, token: string) {
	const input = await readJson<UploadRequest>(request);
	if (!isAssetKind(input.kind)) return json(400, { error: "Unsupported asset kind." });
	const rules = ASSET_RULES[input.kind];
	const contentType = cleanText(input.contentType, 100).toLowerCase();
	const ext = rules.types[contentType];
	if (!ext) return json(415, { error: "This file type is not supported." });
	const size = positiveInt(input.size);
	if (!size) return json(400, { error: "File size is required." });
	if (size > rules.maxBytes) {
		return json(413, { error: `File must be ${rules.maxBytes / MB} MB or smaller.` });
	}
	const filename = cleanText(input.filename, 255) || `file.${ext}`;
	const sha256 = typeof input.sha256 === "string" && SHA256_RE.test(input.sha256)
		? input.sha256
		: null;

	if (sha256) {
		const existing = await findAsset(token, project.id, { sha256: `eq.${sha256}` });
		if (existing?.status === "ready") return json(200, { asset: existing, existing: true });
		if (existing) {
			return json(200, {
				asset: existing,
				upload: await uploadTicket(project, existing.r2_key, existing.content_type),
			});
		}
	}

	const id = crypto.randomUUID();
	const r2Key = assetKey.projectAsset(project.organization_id, project.id, id, ext);
	const response = await dataApi(token, "/assets", {
		method: "POST",
		headers: { prefer: "return=representation" },
		body: JSON.stringify({
			id,
			organization_id: project.organization_id,
			project_id: project.id,
			scene_id: typeof input.sceneId === "string" && UUID_RE.test(input.sceneId)
				? input.sceneId
				: null,
			kind: input.kind,
			status: "pending",
			name: cleanText(input.name, 255) || filename,
			r2_key: r2Key,
			filename,
			content_type: contentType,
			size,
			width: positiveInt(input.width),
			height: positiveInt(input.height),
			sha256,
		}),
	});
	if (!response.ok) {
		// Lost a race with an identical upload: hand back that row instead.
		if (response.status === 409 && sha256) {
			const existing = await findAsset(token, project.id, { sha256: `eq.${sha256}` });
			if (existing) {
				return json(200, existing.status === "ready"
					? { asset: existing, existing: true }
					: {
						asset: existing,
						upload: await uploadTicket(project, existing.r2_key, existing.content_type),
					});
			}
		}
		return json(403, { error: await dataError(response, "Could not create the asset.") });
	}
	const rows = (await response.json()) as AssetRow[];
	const asset = rows[0];
	if (!asset) return json(403, { error: "Could not create the asset." });
	return json(200, { asset, upload: await uploadTicket(project, r2Key, contentType) });
}

async function commitUpload(request: Request, row: AssetRow, token: string) {
	const input = await readJson<Pick<UploadRequest, "width" | "height">>(request);
	const head = await env.ASSETS.head(row.r2_key);
	if (!head) return json(400, { error: "Upload not found." });
	if (
		head.size > ASSET_RULES[row.kind].maxBytes ||
		head.httpMetadata?.contentType !== row.content_type
	) {
		await deleteObject(row.r2_key);
		return json(400, { error: "Uploaded file does not match the declared type or size." });
	}

	const patch: Record<string, unknown> = { status: "ready", size: head.size };
	const width = positiveInt(input.width);
	const height = positiveInt(input.height);
	if (width && height) Object.assign(patch, { width, height });

	const response = await patchAsset(token, row.id, patch);
	if (!response.ok) {
		return json(403, { error: await dataError(response, "Could not commit the asset.") });
	}
	const rows = (await response.json()) as AssetRow[];
	return json(200, { asset: rows[0] ?? { ...row, ...patch } });
}
