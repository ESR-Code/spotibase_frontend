import { env } from "cloudflare:workers";
import { joinUrl, json } from "./http";
import {
	assetKey,
	dataApi,
	deleteObject,
	directUploadEnabled,
	presignPut,
	readJson,
	UPLOAD_TTL_SECONDS,
	UUID,
	UUID_RE,
} from "./storage-common";

export const ORG_LOGO_KEY_RE = new RegExp(`^orgs/(${UUID})/logo/${UUID}\\.webp$`, "i");

const LOGO_TYPE = "image/webp";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
/** Roles Neon Auth grants `organization:update` by default. */
const LOGO_MANAGER_ROLES = new Set(["owner", "admin"]);

type OrgSnapshot = { id: string; logo: string | null };

/** Calls Neon Auth as the signed-in user (session cookie forwarded). */
function neonAuth(request: Request, path: string, init?: RequestInit) {
	const headers = new Headers(init?.headers);
	headers.set("cookie", request.headers.get("cookie") ?? "");
	headers.set("origin", request.headers.get("origin") ?? env.APP_ORIGIN);
	headers.set("accept", "application/json");
	if (init?.body) headers.set("content-type", "application/json");
	const [pathname, search = ""] = path.split("?");
	return fetch(joinUrl(env.NEON_AUTH_BASE_URL, pathname, search ? `?${search}` : ""), {
		...init,
		headers,
	});
}

async function upstreamError(response: Response, fallback: string) {
	try {
		const body = (await response.json()) as { message?: string };
		return body.message || fallback;
	} catch {
		return fallback;
	}
}

/** The caller's role in the org, or null when they are not a member. */
async function memberRole(request: Request, orgId: string) {
	const q = new URLSearchParams({ organizationId: orgId });
	const response = await neonAuth(request, `/organization/get-active-member-role?${q}`);
	if (!response.ok) return null;
	const body = (await response.json()) as { role?: string } | null;
	return body?.role ?? null;
}

async function currentOrg(request: Request, orgId: string): Promise<OrgSnapshot | null> {
	const q = new URLSearchParams({ organizationId: orgId, membersLimit: "1" });
	const response = await neonAuth(request, `/organization/get-full-organization?${q}`);
	if (!response.ok) return null;
	const body = (await response.json()) as { id?: string; logo?: string | null } | null;
	return body?.id ? { id: body.id, logo: body.logo ?? null } : null;
}

async function setLogo(request: Request, orgId: string, logo: string | null) {
	const response = await neonAuth(request, "/organization/update", {
		method: "POST",
		body: JSON.stringify({ organizationId: orgId, data: { logo } }),
	});
	if (!response.ok) {
		return { error: await upstreamError(response, `Could not update the organization (${response.status}).`) };
	}
	return { row: (await response.json()) as unknown };
}

function isOwnLogoKey(orgId: string, key: unknown): key is string {
	if (typeof key !== "string") return false;
	const match = key.match(ORG_LOGO_KEY_RE);
	return Boolean(match && match[1].toLowerCase() === orgId.toLowerCase());
}

/** Members only. Uses the same RLS helper as product tables. */
export async function isOrgMember(token: string, orgId: string) {
	if (!UUID_RE.test(orgId)) return false;
	const response = await dataApi(token, "/rpc/is_org_member", {
		method: "POST",
		body: JSON.stringify({ org_id: orgId }),
	});
	if (!response.ok) return false;
	return (await response.json()) === true;
}

/** `/storage/orgs/:orgId/logo[/upload-url|/upload|/commit]` */
export async function handleOrgLogo(request: Request, orgId: string, action: string) {
	if (!UUID_RE.test(orgId)) return json(404, { error: "Organization not found." });

	const role = await memberRole(request, orgId);
	if (!role) return json(404, { error: "Organization not found." });
	if (!LOGO_MANAGER_ROLES.has(role)) {
		return json(403, { error: "Only owners and admins can change the organization logo." });
	}

	if (action === "/upload-url" && request.method === "POST") {
		const key = assetKey.orgLogo(orgId);
		const url = directUploadEnabled()
			? `/gateway/storage/orgs/${orgId}/logo/upload?key=${encodeURIComponent(key)}`
			: await presignPut(key, LOGO_TYPE);
		return json(200, {
			key,
			url,
			method: "PUT",
			headers: { "content-type": LOGO_TYPE },
			expiresIn: UPLOAD_TTL_SECONDS,
		});
	}

	if (action === "/upload" && request.method === "PUT") {
		if (!directUploadEnabled()) return json(404, { error: "Not found." });
		const key = new URL(request.url).searchParams.get("key");
		if (!isOwnLogoKey(orgId, key)) return json(400, { error: "Invalid logo key." });
		if (request.headers.get("content-type") !== LOGO_TYPE) {
			return json(415, { error: "Logo must be a WebP image." });
		}
		const body = await request.arrayBuffer();
		if (body.byteLength > MAX_LOGO_BYTES) {
			return json(413, { error: "Logo must be 2 MB or smaller." });
		}
		await env.ASSETS.put(key, body, { httpMetadata: { contentType: LOGO_TYPE } });
		return json(200, { ok: true });
	}

	if (action === "/commit" && request.method === "POST") {
		const { key } = await readJson<{ key: string }>(request);
		if (!isOwnLogoKey(orgId, key)) return json(400, { error: "Invalid logo key." });

		const head = await env.ASSETS.head(key);
		if (!head) return json(400, { error: "Upload not found." });
		if (head.size > MAX_LOGO_BYTES || head.httpMetadata?.contentType !== LOGO_TYPE) {
			await deleteObject(key);
			return json(400, { error: "Logo must be a WebP image up to 2 MB." });
		}

		const before = await currentOrg(request, orgId);
		const result = await setLogo(request, orgId, key);
		if ("error" in result) {
			await deleteObject(key);
			return json(403, { error: result.error });
		}
		if (before?.logo !== key && isOwnLogoKey(orgId, before?.logo)) {
			await deleteObject(before.logo);
		}
		return json(200, result.row);
	}

	if (action === "" && request.method === "DELETE") {
		const before = await currentOrg(request, orgId);
		if (!before?.logo) return json(200, { ok: true });
		const result = await setLogo(request, orgId, null);
		if ("error" in result) return json(403, { error: result.error });
		if (isOwnLogoKey(orgId, before.logo)) await deleteObject(before.logo);
		return json(200, result.row);
	}

	return json(405, { error: "Method not allowed." });
}
