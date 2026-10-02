CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, neon_auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM neon_auth.member AS m
    WHERE m."organizationId" = org_id
      AND m."userId" = auth.uid()
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;--> statement-breakpoint
DROP POLICY IF EXISTS "project_folders_org_member" ON "project_folders";--> statement-breakpoint
DROP POLICY IF EXISTS "projects_org_member" ON "projects";--> statement-breakpoint
CREATE POLICY "project_folders_org_member" ON "project_folders" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_org_member("organization_id")) WITH CHECK (public.is_org_member("organization_id"));--> statement-breakpoint
CREATE POLICY "projects_org_member" ON "projects" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_org_member("organization_id")) WITH CHECK (public.is_org_member("organization_id"));
