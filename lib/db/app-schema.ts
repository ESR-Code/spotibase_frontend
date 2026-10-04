/**
 * Product tables in `public`. Migrated via drizzle-kit.
 * Do not put Managed Better Auth (`neon_auth`) tables here.
 */
import { sql, type SQL } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/neon";
import {
  type AnyPgColumn,
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { FolderColor } from "@/lib/projects/folder-colors";

export type { FolderColor };

export const ASSET_KINDS = ["model", "image", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_STATUSES = ["pending", "ready"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const SCENE_TYPES = ["model", "image", "geo"] as const;

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
    /** Project-wide editor state (App Start graph, general style, primary scene). */
    editorData: jsonb("editor_data"),
    /** Bumped by `save_editor_project`; stale saves are rejected. */
    editorRevision: integer("editor_revision").notNull().default(0),
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
    unique("projects_id_organization_id_key").on(table.id, table.organizationId),
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

/**
 * Project media. The row says what the file is; `r2_key` says where it lives
 * (`orgs/{org}/projects/{project}/assets/{id}.{ext}`, immutable).
 */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    /** Scene the file was uploaded from. Informational only (no FK, no cascade). */
    sceneId: uuid("scene_id"),
    kind: text("kind").$type<AssetKind>().notNull(),
    status: text("status").$type<AssetStatus>().notNull().default("pending"),
    name: text("name").notNull(),
    r2Key: text("r2_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    sha256: text("sha256"),
    metadata: jsonb("metadata").notNull().default({}),
    createdBy: uuid("created_by").default(sql`(auth.user_id())::uuid`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("assets_project_id_idx").on(table.projectId),
    unique("assets_r2_key_key").on(table.r2Key),
    uniqueIndex("assets_project_id_sha256_key")
      .on(table.projectId, table.sha256)
      .where(sql`${table.sha256} IS NOT NULL`),
    check(
      "assets_kind_check",
      sql`${table.kind} IN ('model', 'image', 'other')`,
    ),
    check(
      "assets_status_check",
      sql`${table.status} IN ('pending', 'ready')`,
    ),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [projects.id, projects.organizationId],
      name: "assets_project_org_fkey",
    }).onDelete("cascade"),
    pgPolicy("assets_org_member", {
      for: "all",
      to: authenticatedRole,
      using: isOrgMember(table.organizationId),
      withCheck: isOrgMember(table.organizationId),
    }),
  ],
).enableRLS();

/** One editor scene. `data` is the editor `Scene` minus the lifted columns. */
export const scenes = pgTable(
  "scenes",
  {
    /** Client-generated uuid so the editor id is the row id. */
    id: uuid("id").primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    /** Set once at creation; unique per project (future viewer URLs). */
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    thumbnailAssetId: uuid("thumbnail_asset_id"),
    type: text("type").$type<(typeof SCENE_TYPES)[number]>().notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("scenes_project_id_idx").on(table.projectId),
    unique("scenes_project_id_slug_key").on(table.projectId, table.slug),
    check("scenes_type_check", sql`${table.type} IN ('model', 'image', 'geo')`),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [projects.id, projects.organizationId],
      name: "scenes_project_org_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.thumbnailAssetId],
      foreignColumns: [assets.id],
      name: "scenes_thumbnail_asset_id_fkey",
    }).onDelete("set null"),
    pgPolicy("scenes_org_member", {
      for: "all",
      to: authenticatedRole,
      using: isOrgMember(table.organizationId),
      withCheck: isOrgMember(table.organizationId),
    }),
  ],
).enableRLS();

export type ProjectFolder = typeof projectFolders.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type SceneRecord = typeof scenes.$inferSelect;
