CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"scene_id" uuid,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"name" text NOT NULL,
	"r2_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"sha256" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid DEFAULT (auth.user_id())::uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "assets_r2_key_key" UNIQUE("r2_key"),
	CONSTRAINT "assets_kind_check" CHECK ("assets"."kind" IN ('model', 'image', 'other')),
	CONSTRAINT "assets_status_check" CHECK ("assets"."status" IN ('pending', 'ready'))
);
--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"thumbnail_asset_id" uuid,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "scenes_project_id_slug_key" UNIQUE("project_id","slug"),
	CONSTRAINT "scenes_type_check" CHECK ("scenes"."type" IN ('model', 'image', 'geo'))
);
--> statement-breakpoint
ALTER TABLE "scenes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "editor_data" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "editor_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_id_organization_id_key" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_org_fkey" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."projects"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_org_fkey" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."projects"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_thumbnail_asset_id_fkey" FOREIGN KEY ("thumbnail_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_project_id_idx" ON "assets" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_project_id_sha256_key" ON "assets" USING btree ("project_id","sha256") WHERE "assets"."sha256" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "scenes_project_id_idx" ON "scenes" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "assets_org_member" ON "assets" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.is_org_member("assets"."organization_id"))) WITH CHECK ((SELECT public.is_org_member("assets"."organization_id")));--> statement-breakpoint
CREATE POLICY "scenes_org_member" ON "scenes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.is_org_member("scenes"."organization_id"))) WITH CHECK ((SELECT public.is_org_member("scenes"."organization_id")));--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "assets" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "scenes" TO "authenticated";--> statement-breakpoint
-- Atomic editor save. SECURITY INVOKER: every read/write below still runs
-- under the caller's RLS policies. Raises `revision_conflict` when the
-- project was saved elsewhere since the caller loaded it.
CREATE OR REPLACE FUNCTION public.save_editor_project(
  p_project_id uuid,
  p_expected_revision integer,
  p_editor_data jsonb,
  p_scenes jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_revision integer;
  v_ids uuid[];
BEGIN
  SELECT organization_id, editor_revision
    INTO v_org, v_revision
    FROM projects
   WHERE id = p_project_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'This project was saved somewhere else. Reload to get the latest version.'
      USING ERRCODE = 'PT409', HINT = 'revision_conflict';
  END IF;
  IF jsonb_typeof(p_scenes) <> 'array' THEN
    RAISE EXCEPTION 'p_scenes must be an array.' USING ERRCODE = '22023';
  END IF;

  v_ids := ARRAY(
    SELECT (s->>'id')::uuid FROM jsonb_array_elements(p_scenes) AS s
  );

  DELETE FROM scenes
   WHERE project_id = p_project_id
     AND NOT (id = ANY (v_ids));

  INSERT INTO scenes AS t (
    id, organization_id, project_id, name, slug, sort_order,
    thumbnail_asset_id, type, data, updated_at
  )
  SELECT
    (s->>'id')::uuid,
    v_org,
    p_project_id,
    s->>'name',
    s->>'slug',
    COALESCE((s->>'sort_order')::integer, 0),
    NULLIF(s->>'thumbnail_asset_id', '')::uuid,
    s->>'type',
    COALESCE(s->'data', '{}'::jsonb),
    CURRENT_TIMESTAMP
  FROM jsonb_array_elements(p_scenes) AS s
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    sort_order = EXCLUDED.sort_order,
    thumbnail_asset_id = EXCLUDED.thumbnail_asset_id,
    data = EXCLUDED.data,
    updated_at = CURRENT_TIMESTAMP
  WHERE t.project_id = p_project_id;

  UPDATE projects
     SET editor_data = p_editor_data,
         editor_revision = v_revision + 1,
         scene_count = jsonb_array_length(p_scenes),
         updated_at = CURRENT_TIMESTAMP
   WHERE id = p_project_id;

  RETURN v_revision + 1;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.save_editor_project(uuid, integer, jsonb, jsonb) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.save_editor_project(uuid, integer, jsonb, jsonb) TO authenticated;
