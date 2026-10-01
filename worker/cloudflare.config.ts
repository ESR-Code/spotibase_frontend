import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
	worker: {
		name: "vectorforge-api",
		compatibilityDate: "2026-09-30",
		entrypoint,
		env: {
			NEON_AUTH_BASE_URL: bindings.secret(),
			NEON_DATA_API_URL: bindings.secret(),
			APP_ORIGIN: bindings.secret(),
			NEON_FUNCTION_URL: bindings.secret(),
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
