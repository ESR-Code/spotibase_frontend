/**
 * Product tables in `public`. Migrated via drizzle-kit.
 * Do not put Managed Better Auth (`neon_auth`) tables here.
 */
import { sql, type SQL } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/neon";
import {
  type AnyPgColumn,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { FolderColor } from "@/lib/projects/folder-colors";

export type { FolderColor };

function isOrgMember(organizationIdColumn: AnyPgColumn): SQL {
  // plpgsql (not inlined) so the membership lookup keeps SECURITY DEFINER
  // and does not run as the Data API role, which cannot read neon_auth.
  return sql`(SELECT public.is_org_member(${organizationIdColumn}))`;
}

export const projectFolders = pgTable(
  "project_folders",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    name: text("name").notNull(),
    color: text("color").$type<FolderColor>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("project_folders_organization_id_idx").on(table.organizationId),
    pgPolicy("project_folders_org_member", {
      for: "all",
      to: authenticatedRole,
      using: isOrgMember(table.organizationId),
      withCheck: isOrgMember(table.organizationId),
    }),
  ],
).enableRLS();

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    folderId: uuid("folder_id"),
    name: text("name").notNull(),
    description: text("description"),
    sceneCount: integer("scene_count").notNull().default(0),
    /** R2 object key (not a URL); served via `/gateway/files/<key>`. */
    thumbnailR2Key: text("thumbnail_r2_key"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("projects_organization_id_idx").on(table.organizationId),
    index("projects_folder_id_idx").on(table.folderId),
    foreignKey({
      columns: [table.folderId],
      foreignColumns: [projectFolders.id],
      name: "projects_folder_id_fkey",
    }).onDelete("set null"),
    pgPolicy("projects_org_member", {
      for: "all",
      to: authenticatedRole,
      using: isOrgMember(table.organizationId),
      withCheck: isOrgMember(table.organizationId),
    }),
  ],
).enableRLS();

export type ProjectFolder = typeof projectFolders.$inferSelect;
export type Project = typeof projects.$inferSelect;
