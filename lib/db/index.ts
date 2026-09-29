import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as relations from "./relations";
import * as schema from "./schema";

/**
 * Server-only Drizzle client. Do not import from Client Components.
 * Uses the pooled `DATABASE_URL`. drizzle-kit uses `DATABASE_URL_UNPOOLED`.
 */
export function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(url), { schema: { ...schema, ...relations } });
}

export type Db = ReturnType<typeof createDb>;
