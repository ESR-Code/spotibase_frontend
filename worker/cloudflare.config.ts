import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

// The Worker tsconfig has no Node types; this file itself is evaluated in Node.
const R2_REMOTE =
	(globalThis as { process?: { env: Record<string, string | undefined> } })
		.process?.env.R2_REMOTE === "true";

export default defineConfig({
	worker: {
		name: "spotibase-api",
		compatibilityDate: "2026-09-30",
		entrypoint,
		env: {
			NEON_AUTH_BASE_URL: bindings.secret(),
			NEON_DATA_API_URL: bindings.secret(),
			APP_ORIGIN: bindings.secret(),
			NEON_FUNCTION_URL: bindings.secret(),
			R2_ACCOUNT_ID: bindings.secret(),
			R2_ACCESS_KEY_ID: bindings.secret(),
			R2_SECRET_ACCESS_KEY: bindings.secret(),
			R2_BUCKET_NAME: bindings.secret(),
			// Presigned PUTs always hit the real bucket, so storage only works in
			// dev with R2_REMOTE=true (needs R2 enabled and a Cloudflare login).
			ASSETS: bindings.r2({
				name: "spotibase-assets",
				dev: { remote: R2_REMOTE },
			}),
			STORAGE_RATE_LIMIT: bindings.rateLimit({
				namespace: "1003",
				simple: { limit: 60, period: 60 },
			}),
			AUTH_RATE_LIMIT: bindings.rateLimit({
				namespace: "1001",
				simple: { limit: 20, period: 60 },
			}),
			DATA_RATE_LIMIT: bindings.rateLimit({
				namespace: "1002",
				simple: { limit: 120, period: 60 },
			}),
		},
	},
});
