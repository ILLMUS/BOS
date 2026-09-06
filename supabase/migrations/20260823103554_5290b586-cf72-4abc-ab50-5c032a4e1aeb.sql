-- 1. job_payments: enforce recorded_by = auth.uid()
DROP POLICY IF EXISTS "org members manage job_payments" ON public.job_payments;
CREATE POLICY "job_payments_select" ON public.job_payments FOR SELECT TO authenticated
  USING (public.can_access_job(job_id));
CREATE POLICY "job_payments_insert" ON public.job_payments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_job(job_id) AND recorded_by = auth.uid());
CREATE POLICY "job_payments_update" ON public.job_payments FOR UPDATE TO authenticated
  USING (public.can_access_job(job_id) AND (recorded_by = auth.uid() OR public.job_authority(job_id) >= 2))
  WITH CHECK (public.can_access_job(job_id) AND recorded_by = auth.uid());
CREATE POLICY "job_payments_delete" ON public.job_payments FOR DELETE TO authenticated
  USING (public.can_access_job(job_id) AND (recorded_by = auth.uid() OR public.job_authority(job_id) >= 2));

-- 2. Approval guards via triggers (column-level authority enforcement)
CREATE OR REPLACE FUNCTION public.guard_variation_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
      OR NEW.client_decision_at IS DISTINCT FROM OLD.client_decision_at)
     AND public.job_authority(NEW.job_id) < 2 THEN
    RAISE EXCEPTION 'Only managers or above can approve or reject variations';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_variation_approval ON public.job_variations;
CREATE TRIGGER trg_guard_variation_approval BEFORE UPDATE ON public.job_variations
  FOR EACH ROW EXECUTE FUNCTION public.guard_variation_approval();

CREATE OR REPLACE FUNCTION public.guard_drawing_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
      OR NEW.client_approved_at IS DISTINCT FROM OLD.client_approved_at
      OR NEW.client_approver_name IS DISTINCT FROM OLD.client_approver_name)
     AND public.job_authority(NEW.job_id) < 2 THEN
    RAISE EXCEPTION 'Only managers or above can approve or reject shop drawings';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_drawing_approval ON public.shop_drawings;
CREATE TRIGGER trg_guard_drawing_approval BEFORE UPDATE ON public.shop_drawings
  FOR EACH ROW EXECUTE FUNCTION public.guard_drawing_approval();

CREATE OR REPLACE FUNCTION public.guard_preflight_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (NEW.manager_approved_by IS NOT NULL OR NEW.manager_approved_at IS NOT NULL)
       AND public.job_authority(NEW.job_id) < 2 THEN
      RAISE EXCEPTION 'Only managers or above can approve pre-flight checks';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW.manager_approved_by IS DISTINCT FROM OLD.manager_approved_by
      OR NEW.manager_approved_at IS DISTINCT FROM OLD.manager_approved_at)
     AND public.job_authority(NEW.job_id) < 2 THEN
    RAISE EXCEPTION 'Only managers or above can approve pre-flight checks';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_preflight_approval ON public.pre_flight_checks;
CREATE TRIGGER trg_guard_preflight_approval BEFORE INSERT OR UPDATE ON public.pre_flight_checks
  FOR EACH ROW EXECUTE FUNCTION public.guard_preflight_approval();

-- 3. Revoke direct EXECUTE on internal permission helpers
REVOKE EXECUTE ON FUNCTION public.can_access_job(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_owner(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_admin_for_job(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.job_authority(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.org_authority(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.shares_org_with(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_variation_approval() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_drawing_approval() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_preflight_approval() FROM anon, authenticated;

-- 4. Close the unused GraphQL surface
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql_public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA graphql FROM anon, authenticated;