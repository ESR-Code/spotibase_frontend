-- Publishing: immutable project snapshots + optional password protection.
-- project_versions is readable by org members (RLS) but never writable through
-- the Data API: only the SECURITY DEFINER functions below insert/archive/prune.
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "publish_password_protected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "project_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"asset_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_by" uuid DEFAULT (public.current_user_id())::uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "project_versions_project_id_version_key" UNIQUE("project_id","version"),
	CONSTRAINT "project_versions_status_check" CHECK ("project_versions"."status" IN ('published', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "project_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_publish_secrets" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_publish_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_org_fkey" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."projects"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_publish_secrets" ADD CONSTRAINT "project_publish_secrets_project_org_fkey" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."projects"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_versions_project_id_idx" ON "project_versions" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_versions_one_published_key" ON "project_versions" USING btree ("project_id") WHERE "project_versions"."status" = 'published';--> statement-breakpoint
CREATE INDEX "project_versions_asset_ids_idx" ON "project_versions" USING gin ("asset_ids");--> statement-breakpoint
CREATE POLICY "project_versions_org_member_read" ON "project_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.is_org_member("project_versions"."organization_id")));--> statement-breakpoint
-- No writes from the Data API: drop every default/inherited privilege first,
-- then grant SELECT only. The secrets table gets no grants at all.
REVOKE ALL ON TABLE "project_versions" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "project_publish_secrets" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "project_versions" FROM "authenticated";--> statement-breakpoint
REVOKE ALL ON TABLE "project_publish_secrets" FROM "authenticated";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    REVOKE ALL ON TABLE "project_versions" FROM "anonymous";
    REVOKE ALL ON TABLE "project_publish_secrets" FROM "anonymous";
  END IF;
END
$$;--> statement-breakpoint
GRANT SELECT ON TABLE "project_versions" TO "authenticated";--> statement-breakpoint
-- Publish the saved draft as a new immutable version. Keeps the 5 newest
-- versions (live included). Pruning deletes the row and its asset_ids in the
-- same commit; asset rows / R2 objects are left for the Worker GC, which keeps
-- anything the draft or a retained version still references.
CREATE OR REPLACE FUNCTION public.publish_project_version(
  p_project_id uuid,
  p_expected_revision integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_keep CONSTANT integer := 5;
  c_uuid CONSTANT text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
  v_org uuid;
  v_name text;
  v_revision integer;
  v_editor_data jsonb;
  v_scenes jsonb;
  v_text text;
  v_asset_ids uuid[];
  v_assets jsonb;
  v_snapshot jsonb;
  v_version integer;
  v_id uuid;
  v_created timestamptz;
BEGIN
  SELECT organization_id, name, editor_revision, editor_data
    INTO v_org, v_name, v_revision, v_editor_data
    FROM projects
   WHERE id = p_project_id
   FOR UPDATE;
  IF NOT FOUND OR NOT public.is_org_member(v_org) THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'This project was saved somewhere else. Reload to get the latest version.'
      USING ERRCODE = 'PT409', HINT = 'revision_conflict';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'name', s.name,
           'slug', s.slug,
           'sort_order', s.sort_order,
           'type', s.type,
           'thumbnail_asset_id', s.thumbnail_asset_id,
           'data', s.data
         ) ORDER BY s.sort_order, s.id), '[]'::jsonb)
    INTO v_scenes
    FROM scenes AS s
   WHERE s.project_id = p_project_id;

  -- Same rules as the Worker GC: `asset:<uuid>` strings, `subjectAssetId`
  -- values, and the lifted scene thumbnail column (inside v_scenes).
  v_text := COALESCE(v_editor_data, 'null'::jsonb)::text || v_scenes::text;
  SELECT COALESCE(array_agg(DISTINCT id), '{}'::uuid[])
    INTO v_asset_ids
    FROM (
      SELECT lower((regexp_matches(v_text, 'asset:(' || c_uuid || ')', 'g'))[1])::uuid AS id
      UNION
      SELECT lower((regexp_matches(v_text, '"subjectAssetId":\s*"(' || c_uuid || ')"', 'g'))[1])::uuid
      UNION
      SELECT (s->>'thumbnail_asset_id')::uuid
        FROM jsonb_array_elements(v_scenes) AS s
       WHERE NULLIF(s->>'thumbnail_asset_id', '') IS NOT NULL
    ) AS refs;

  SELECT COALESCE(jsonb_object_agg(a.id::text, jsonb_build_object(
           'r2Key', a.r2_key,
           'kind', a.kind,
           'contentType', a.content_type,
           'width', a.width,
           'height', a.height
         )), '{}'::jsonb)
    INTO v_assets
    FROM assets AS a
   WHERE a.project_id = p_project_id
     AND a.status = 'ready'
     AND a.id = ANY (v_asset_ids);

  v_snapshot := jsonb_build_object(
    'formatVersion', 1,
    'editorRevision', v_revision,
    'project', jsonb_build_object('id', p_project_id, 'name', v_name),
    'editorData', v_editor_data,
    'scenes', v_scenes,
    'assets', v_assets
  );

  UPDATE project_versions
     SET status = 'archived'
   WHERE project_id = p_project_id
     AND status = 'published';

  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM project_versions
   WHERE project_id = p_project_id;

  INSERT INTO project_versions (
    organization_id, project_id, version, status, snapshot, asset_ids, created_by
  )
  VALUES (
    v_org, p_project_id, v_version, 'published', v_snapshot, v_asset_ids,
    NULLIF(public.current_user_id(), '')::uuid
  )
  RETURNING id, created_at INTO v_id, v_created;

  DELETE FROM project_versions
   WHERE project_id = p_project_id
     AND id NOT IN (
       SELECT id FROM project_versions
        WHERE project_id = p_project_id
        ORDER BY version DESC
        LIMIT c_keep
     );

  RETURN jsonb_build_object('id', v_id, 'version', v_version, 'created_at', v_created);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.publish_project_version(uuid, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.publish_project_version(uuid, integer) TO authenticated;--> statement-breakpoint
-- Take the live version offline. Keeps the row (as archived); never prunes.
CREATE OR REPLACE FUNCTION public.unpublish_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_org_member(v_org) THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;
  UPDATE project_versions
     SET status = 'archived'
   WHERE project_id = p_project_id
     AND status = 'published';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.unpublish_project(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.unpublish_project(uuid) TO authenticated;--> statement-breakpoint
-- NULL clears the password; otherwise stores a bcrypt hash. The hash lives in
-- project_publish_secrets, which the Data API cannot read.
CREATE OR REPLACE FUNCTION public.set_project_publish_password(
  p_project_id uuid,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_org_member(v_org) THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_password IS NULL THEN
    DELETE FROM project_publish_secrets WHERE project_id = p_project_id;
    UPDATE projects SET publish_password_protected = false WHERE id = p_project_id;
    RETURN;
  END IF;

  IF char_length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO project_publish_secrets AS t (project_id, organization_id, password_hash, updated_at)
  VALUES (p_project_id, v_org, crypt(p_password, gen_salt('bf')), CURRENT_TIMESTAMP)
  ON CONFLICT (project_id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP;
  UPDATE projects SET publish_password_protected = true WHERE id = p_project_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.set_project_publish_password(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_project_publish_password(uuid, text) TO authenticated;
