#!/usr/bin/env node
/**
 * Creates (or rotates the password of) the `spotibase_viewer` login role used
 * by the Worker's public viewer routes, and prints its connection string.
 *
 * The role is created with SQL, NOT `neon roles create`: Neon-managed roles
 * are members of `neon_superuser`, which is far too much for a credential that
 * backs anonymous endpoints. This role only inherits `viewer_reader`
 * (migration 0009), which can EXECUTE three SECURITY DEFINER functions and
 * nothing else.
 *
 * Usage (after `npm run db:migrate`):
 *   node scripts/create-viewer-role.mjs           # print VIEWER_DATABASE_URL
 *   node scripts/create-viewer-role.mjs --write   # also upsert it into worker/.dev.vars
 * Production: run against the production branch's DATABASE_URL and store the
 * printed value as the Worker secret `VIEWER_DATABASE_URL`.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const ROLE = "spotibase_viewer";

nextEnv.loadEnvConfig(process.cwd());
const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) {
  console.error("DATABASE_URL is required (see .env.local).");
  process.exit(1);
}

const sql = neon(ownerUrl);
const [{ exists: hasReader }] =
  await sql`select exists(select 1 from pg_roles where rolname = 'viewer_reader') as exists`;
if (!hasReader) {
  console.error("Role viewer_reader is missing. Run `npm run db:migrate` first.");
  process.exit(1);
}

// Hex only, so it is safe to inline (CREATE ROLE cannot take parameters).
const password = randomBytes(24).toString("hex");
const [{ exists }] =
  await sql`select exists(select 1 from pg_roles where rolname = ${ROLE}) as exists`;
if (exists) {
  await sql.query(`ALTER ROLE ${ROLE} WITH LOGIN PASSWORD '${password}'`);
} else {
  await sql.query(
    `CREATE ROLE ${ROLE} WITH LOGIN NOINHERIT PASSWORD '${password}' CONNECTION LIMIT 50`,
  );
}
await sql.query(`ALTER ROLE ${ROLE} INHERIT`);
await sql.query(`GRANT viewer_reader TO ${ROLE}`);
await sql.query(`ALTER ROLE ${ROLE} SET statement_timeout = '5s'`);

const url = new URL(ownerUrl);
url.username = ROLE;
url.password = password;
const viewerUrl = url.toString();

if (process.argv.includes("--write")) {
  const file = resolve("worker/.dev.vars");
  const lines = existsSync(file)
    ? readFileSync(file, "utf8").split("\n").filter((l) => !l.startsWith("VIEWER_DATABASE_URL="))
    : [];
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  lines.push(`VIEWER_DATABASE_URL=${viewerUrl}`, "");
  writeFileSync(file, lines.join("\n"));
  console.log(`${exists ? "Rotated" : "Created"} ${ROLE}; wrote VIEWER_DATABASE_URL to worker/.dev.vars`);
} else {
  console.log(`${exists ? "Rotated" : "Created"} ${ROLE}.`);
  console.log(`VIEWER_DATABASE_URL=${viewerUrl}`);
}
