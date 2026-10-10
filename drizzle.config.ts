import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL_UNPOOLED (or DATABASE_URL) is required for drizzle-kit",
  );
}

/** Product tables only — never generate/push Managed Auth (`neon_auth`) DDL. */
export default defineConfig({
  schema: "./lib/db/app-schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  schemaFilter: ["public"],
  tablesFilter: ["project_folders", "projects", "scenes", "assets", "project_versions", "project_publish_secrets"],
});
