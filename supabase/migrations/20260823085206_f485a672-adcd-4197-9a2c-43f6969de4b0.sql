-- 1. search_path on email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2. Org-scoped admin check + job-file path helper
CREATE OR REPLACE FUNCTION public.is_org_admin_for_job(_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.user_roles ur ON ur.org_id = j.org_id
    WHERE j.id = _job_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner_director')
  )
$$;

CREATE OR REPLACE FUNCTION public.job_file_job_id(_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN split_part(_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN split_part(_name, '/', 1)::uuid
    ELSE NULL
  END
$$;

-- 3. Storage policies scoped to the owning organization
DROP POLICY IF EXISTS "Anyone can view job files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload job files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete job files" ON storage.objects;

CREATE POLICY "Org members can view job files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-files' AND public.can_access_job(public.job_file_job_id(name)));

CREATE POLICY "Org members can upload job files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-files' AND public.can_access_job(public.job_file_job_id(name)));

CREATE POLICY "Org members can update job files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-files' AND public.can_access_job(public.job_file_job_id(name)))
WITH CHECK (bucket_id = 'job-files' AND public.can_access_job(public.job_file_job_id(name)));

CREATE POLICY "Org admins can delete job files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-files' AND public.is_org_admin_for_job(public.job_file_job_id(name)));

-- 4. Remove anonymous access to every public table (no policy grants anon access)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- 5. Internal-only routines: not callable from the API
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_stage_owners() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_stage_owner() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_job_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_tracking_token() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_sla_defaults() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_variation_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- 6. Anonymous visitors keep only the three genuinely public entry points
REVOKE EXECUTE ON FUNCTION public.active_org_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_deal(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.convert_lead_to_opportunity(uuid, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.convert_opportunity_to_deal(uuid, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_job_from_deal(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_job_from_template(uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_template_version(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin_for_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.job_org_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.setup_workspace(text, text, text, text, text, text, text, text[], text, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_org_with(uuid) FROM anon;