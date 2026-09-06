DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- App routines signed-in users need
GRANT EXECUTE ON FUNCTION public.active_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_deal(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_opportunity(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_opportunity_to_deal(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_from_deal(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_from_template(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_template_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin_for_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_file_job_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_org_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_workspace(text, text, text, text, text, text, text, text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid) TO authenticated;

-- Genuinely public entry points
GRANT EXECUTE ON FUNCTION public.get_capture_form(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_capture_form(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_by_tracking_token(text) TO anon, authenticated;