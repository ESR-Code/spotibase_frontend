import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";
import { joinUrl } from "./http";

export const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const UUID_RE = new RegExp(`^${UUID}$`, "i");

export const UPLOAD_TTL_SECONDS = 300;

export type ProjectAccess = {
	id: string;
	organization_id: string;
	thumbnail_r2_key: string | null;
};

export const assetKey = {
	projectRoot: (orgId: string, projectId: string) =>
		`orgs/${orgId}/projects/${projectId}/`,
	projectThumbnail: (orgId: string, projectId: string) =>
		`${assetKey.projectRoot(orgId, projectId)}thumbnails/${crypto.randomUUID()}.webp`,
	projectAssets: (orgId: string, projectId: string) =>
		`${assetKey.projectRoot(orgId, projectId)}assets/`,
	projectAsset: (orgId: string, projectId: string, assetId: string, ext: string) =>
		`${assetKey.projectAssets(orgId, projectId)}${assetId}.${ext}`,
};

export function dataApi(token: string, path: string, init?: RequestInit) {
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
export async function projectAccess(token: string, projectId: string) {
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

export async function presignPut(key: string, contentType: string) {
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

export async function readJson<T>(request: Request): Promise<Partial<T>> {
	try {
		return (await request.json()) as Partial<T>;
	} catch {
		return {};
	}
}

export async function deleteObject(key: string | null | undefined) {
	if (!key) return;
	try {
		await env.ASSETS.delete(key);
	} catch (error) {
		console.error("R2 delete failed", key, error);
	}
}

/** Without S3 credentials (local dev), uploads go through the Worker into the simulated bucket. */
export function directUploadEnabled() {
	return !env.R2_ACCESS_KEY_ID?.trim() || !env.R2_SECRET_ACCESS_KEY?.trim();
}
