-- pg_session_jwt loads on the first auth.* call in a backend and redefines
-- `request.jwt.claims` as a GUC that cannot be set under SECURITY DEFINER.
-- When that first call happens inside a definer function (is_org_member in an
-- RLS policy), the Data API's claims for the transaction are dropped and every
-- row is hidden. Read the claims directly; call auth.* only without them.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims text := NULLIF(current_setting('request.jwt.claims', true), '');
BEGIN
  IF v_claims IS NOT NULL THEN
    RETURN v_claims::jsonb ->> 'sub';
  END IF;
  RETURN auth.user_id();
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, neon_auth
AS $$
DECLARE
  v_user text := public.current_user_id();
BEGIN
  IF org_id IS NULL OR v_user IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM neon_auth.member AS m
    WHERE m."organizationId" = org_id
      AND m."userId"::text = v_user
  );
END;
$$;
--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "created_by" SET DEFAULT (public.current_user_id())::uuid;
