/**
 * Product tables in `public`. Migrated via drizzle-kit.
 * Do not put Managed Better Auth (`neon_auth`) tables here.
 */
import { sql, type SQL } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/neon";
import {
  type AnyPgColumn,
  bigint,
  boolean,
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
    /** Set by `set_project_publish_password`; the hash lives in `project_publish_secrets`. */
    publishPasswordProtected: boolean("publish_password_protected")
      .notNull()
      .default(false),
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
    createdBy: uuid("created_by").default(sql`(public.current_user_id())::uuid`),
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

export const VERSION_STATUSES = ["published", "archived"] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

/**
 * Immutable publish snapshots (newest 5 per project kept). The Data API can
 * only SELECT; `publish_project_version` / `unpublish_project` write.
 * The migration also REVOKEs INSERT / UPDATE / DELETE from `authenticated`.
 */
export const projectVersions = pgTable(
  "project_versions",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    version: integer("version").notNull(),
    status: text("status").$type<VersionStatus>().notNull(),
    snapshot: jsonb("snapshot").notNull(),
    /** Assets the snapshot references; the Worker GC keeps these. */
    assetIds: uuid("asset_ids").array().notNull().default(sql`'{}'::uuid[]`),
    createdBy: uuid("created_by").default(sql`(public.current_user_id())::uuid`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("project_versions_project_id_idx").on(table.projectId),
    unique("project_versions_project_id_version_key").on(
      table.projectId,
      table.version,
    ),
    uniqueIndex("project_versions_one_published_key")
      .on(table.projectId)
      .where(sql`${table.status} = 'published'`),
    index("project_versions_asset_ids_idx").using("gin", table.assetIds),
    check(
      "project_versions_status_check",
      sql`${table.status} IN ('published', 'archived')`,
    ),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [projects.id, projects.organizationId],
      name: "project_versions_project_org_fkey",
    }).onDelete("cascade"),
    pgPolicy("project_versions_org_member_read", {
      for: "select",
      to: authenticatedRole,
      using: isOrgMember(table.organizationId),
    }),
  ],
).enableRLS();

/** bcrypt hash of the publish password. RLS on, no policies, no grants. */
export const projectPublishSecrets = pgTable(
  "project_publish_secrets",
  {
    projectId: uuid("project_id").primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    passwordHash: text("password_hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [projects.id, projects.organizationId],
      name: "project_publish_secrets_project_org_fkey",
    }).onDelete("cascade"),
  ],
).enableRLS();

export type ProjectFolder = typeof projectFolders.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type SceneRecord = typeof scenes.$inferSelect;
export type ProjectVersion = typeof projectVersions.$inferSelect;
