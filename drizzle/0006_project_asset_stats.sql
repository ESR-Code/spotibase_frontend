-- Compact project-library rollup for the studio Details tab.
-- One index range scan on assets(project_id); no file rows leave the database.
-- SECURITY INVOKER so the caller's RLS still hides other orgs' assets.
CREATE OR REPLACE FUNCTION public.project_asset_stats(p_project_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_bytes', COALESCE(SUM(size), 0),
    'image_count', COUNT(*) FILTER (WHERE kind = 'image'),
    'model_count', COUNT(*) FILTER (WHERE kind = 'model'),
    'other_count', COUNT(*) FILTER (WHERE kind = 'other')
  )
  FROM assets
  WHERE project_id = p_project_id
    AND status = 'ready';
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.project_asset_stats(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.project_asset_stats(uuid) TO authenticated;
