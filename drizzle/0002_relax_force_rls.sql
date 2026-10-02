-- Owner FK checks and SECURITY DEFINER writes must not be denied by policies
-- that only target the `authenticated` role. ENABLE stays on, so that role
-- is still filtered. FORCE made the table owner subject to those policies too.
ALTER TABLE "project_folders" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, neon_auth
AS $$
BEGIN
  IF org_id IS NULL OR auth.user_id() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM neon_auth.member AS m
    WHERE m."organizationId" = org_id
      AND m."userId"::text = auth.user_id()
  );
END;
$$;
