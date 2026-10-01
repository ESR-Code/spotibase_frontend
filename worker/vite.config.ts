import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [cloudflare()],
	server: {
		host: "0.0.0.0",
		port: 8787,
		strictPort: true,
		cors: false,
		watch: {
			usePolling: true,
			interval: 1000,
		},
	},
});
