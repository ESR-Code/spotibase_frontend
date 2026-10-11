-- Republish an archived snapshot without touching the editor draft, and keep
-- that live row when a later publish prunes history. The live version can be
-- older than newer archived rows (republish does not mint a new version number).
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
  v_previous_live uuid;
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

  SELECT id
    INTO v_previous_live
    FROM project_versions
   WHERE project_id = p_project_id
     AND status = 'published';

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

  -- Always keep the new row and the row that was live before this publish
  -- (it may be older than newer archived versions), then fill to 5 by version.
  DELETE FROM project_versions
   WHERE project_id = p_project_id
     AND id NOT IN (
       SELECT id FROM (
         SELECT id
           FROM project_versions
          WHERE project_id = p_project_id
          ORDER BY (id = v_id) DESC,
                   (id = v_previous_live) DESC,
                   version DESC
          LIMIT c_keep
       ) AS kept
     );

  RETURN jsonb_build_object('id', v_id, 'version', v_version, 'created_at', v_created);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.publish_project_version(uuid, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.publish_project_version(uuid, integer) TO authenticated;--> statement-breakpoint
-- Make an existing snapshot live. Archives the current live row. Does not
-- insert a version, prune, or write the editor draft.
CREATE OR REPLACE FUNCTION public.republish_project_version(
  p_project_id uuid,
  p_version_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_version integer;
  v_status text;
BEGIN
  SELECT organization_id INTO v_org FROM projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_org_member(v_org) THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT version, status
    INTO v_version, v_status
    FROM project_versions
   WHERE id = p_version_id
     AND project_id = p_project_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_status = 'published' THEN
    RETURN jsonb_build_object('id', p_version_id, 'version', v_version);
  END IF;

  UPDATE project_versions
     SET status = 'archived'
   WHERE project_id = p_project_id
     AND status = 'published';

  UPDATE project_versions
     SET status = 'published'
   WHERE id = p_version_id
     AND project_id = p_project_id;

  RETURN jsonb_build_object('id', p_version_id, 'version', v_version);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.republish_project_version(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.republish_project_version(uuid, uuid) TO authenticated;
