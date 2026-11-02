-- Public viewer: anonymous read of the live published snapshot.
--
-- The Neon Data API requires a JWT, so anonymous viewers cannot go through it.
-- Instead the Worker's /public/* routes connect as a dedicated login role
-- (`spotibase_viewer`, created out of band by scripts/create-viewer-role.mjs so
-- its password never lands in git). That role is a member of `viewer_reader`,
-- which can only EXECUTE the three functions below: no table privileges.
-- They are deliberately NOT granted to `authenticated` / `anonymous`, so the
-- password check is only reachable through the Worker's rate limit.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'viewer_reader') THEN
    CREATE ROLE viewer_reader NOLOGIN;
  END IF;
END
$$;--> statement-breakpoint
CREATE TABLE "project_viewer_unlocks" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_viewer_unlocks_project_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX "project_viewer_unlocks_project_id_idx" ON "project_viewer_unlocks" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "project_viewer_unlocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "project_viewer_unlocks" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "project_viewer_unlocks" FROM "authenticated";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    REVOKE ALL ON TABLE "project_viewer_unlocks" FROM "anonymous";
  END IF;
END
$$;--> statement-breakpoint
-- True when the project is unprotected, or p_token matches a live unlock.
CREATE OR REPLACE FUNCTION public.viewer_token_ok(
  p_project_id uuid,
  p_protected boolean,
  p_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT NOT p_protected
      OR (p_token IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_viewer_unlocks
             WHERE project_id = p_project_id
               AND token_hash = encode(digest(p_token, 'sha256'), 'hex')
               AND expires_at > CURRENT_TIMESTAMP));
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.viewer_token_ok(uuid, boolean, text) FROM PUBLIC;--> statement-breakpoint
-- The live snapshot, or `locked` / `not_found`. Never leaks data while locked.
CREATE OR REPLACE FUNCTION public.get_published_snapshot(
  p_project_id uuid,
  p_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_protected boolean;
  v_version integer;
  v_snapshot jsonb;
BEGIN
  SELECT p.publish_password_protected, v.version, v.snapshot
    INTO v_protected, v_version, v_snapshot
    FROM project_versions v
    JOIN projects p ON p.id = v.project_id
   WHERE v.project_id = p_project_id
     AND v.status = 'published';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF NOT public.viewer_token_ok(p_project_id, v_protected, p_token) THEN
    RETURN jsonb_build_object('status', 'locked', 'passwordProtected', true);
  END IF;
  RETURN jsonb_build_object(
    'status', 'ok',
    'version', v_version,
    'passwordProtected', v_protected,
    'snapshot', v_snapshot
  );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.get_published_snapshot(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_published_snapshot(uuid, text) TO viewer_reader;--> statement-breakpoint
-- Check a password; on success mint a 12h unlock token (only its hash is stored).
CREATE OR REPLACE FUNCTION public.unlock_published_project(
  p_project_id uuid,
  p_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_token text;
BEGIN
  SELECT s.password_hash INTO v_hash
    FROM project_publish_secrets s
    JOIN projects p ON p.id = s.project_id
   WHERE s.project_id = p_project_id
     AND p.publish_password_protected
     AND EXISTS (SELECT 1 FROM project_versions v
                  WHERE v.project_id = p_project_id AND v.status = 'published');
  IF NOT FOUND OR p_password IS NULL OR crypt(p_password, v_hash) <> v_hash THEN
    RETURN NULL;
  END IF;
  DELETE FROM project_viewer_unlocks
   WHERE project_id = p_project_id AND expires_at <= CURRENT_TIMESTAMP;
  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO project_viewer_unlocks (token_hash, project_id, expires_at)
  VALUES (encode(digest(v_token, 'sha256'), 'hex'), p_project_id,
          CURRENT_TIMESTAMP + interval '12 hours');
  RETURN v_token;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.unlock_published_project(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.unlock_published_project(uuid, text) TO viewer_reader;--> statement-breakpoint
-- Whether the live version references this asset (and the caller may read it).
CREATE OR REPLACE FUNCTION public.is_published_asset(
  p_project_id uuid,
  p_asset_id uuid,
  p_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_protected boolean;
BEGIN
  SELECT p.publish_password_protected INTO v_protected
    FROM project_versions v
    JOIN projects p ON p.id = v.project_id
   WHERE v.project_id = p_project_id
     AND v.status = 'published'
     AND v.asset_ids @> ARRAY[p_asset_id];
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'passwordProtected', false);
  END IF;
  RETURN jsonb_build_object(
    'ok', public.viewer_token_ok(p_project_id, v_protected, p_token),
    'passwordProtected', v_protected
  );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_published_asset(uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_published_asset(uuid, uuid, text) TO viewer_reader;--> statement-breakpoint
-- Same as 0007, plus: changing or clearing the password revokes viewer unlocks.
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

  DELETE FROM project_viewer_unlocks WHERE project_id = p_project_id;

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
-- Same as 0007, plus: unpublishing revokes viewer unlocks.
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
  DELETE FROM project_viewer_unlocks WHERE project_id = p_project_id;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'spotibase_viewer') THEN
    GRANT viewer_reader TO spotibase_viewer;
  END IF;
END
$$;
