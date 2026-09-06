-- 1) Remove Data-API exposure for signed-out visitors (no policy grants anon access anyway)
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.relname);
  END LOOP;
END $$;

-- 2) get_user_roles must not leak other users' roles across organizations
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ur.role
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id AND p.org_id = ur.org_id
  WHERE ur.user_id = _user_id
    AND (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles me
        WHERE me.user_id = auth.uid()
          AND me.org_id = ur.org_id
          AND me.role IN ('super_admin','owner_director')
      )
    )
$function$;

-- 3) app_settings policies should target signed-in users, not the public role
DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can view settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Authenticated can view settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- 4) Missing foreign keys (verified: zero orphaned rows)
ALTER TABLE public.flight_logs       ADD CONSTRAINT flight_logs_job_id_fkey       FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.spray_logs        ADD CONSTRAINT spray_logs_job_id_fkey        FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.pre_flight_checks ADD CONSTRAINT pre_flight_checks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.post_flight_logs  ADD CONSTRAINT post_flight_logs_job_id_fkey  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.shop_drawings     ADD CONSTRAINT shop_drawings_job_id_fkey     FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.job_variations    ADD CONSTRAINT job_variations_job_id_fkey    FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.job_payments      ADD CONSTRAINT job_payments_job_id_fkey      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.job_payments      ADD CONSTRAINT job_payments_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.job_variations(id) ON DELETE SET NULL;