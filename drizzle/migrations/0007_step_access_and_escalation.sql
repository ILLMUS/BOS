ALTER TABLE public.job_stages
  ADD COLUMN IF NOT EXISTS escalation_level smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- Who may act on a step. Hierarchy: primary owner > secondary owner (backup) >
-- managers (only once escalated or when nobody is assigned) > board/Owner.
CREATE OR REPLACE FUNCTION public.can_act_on_stage(_job_id uuid, _primary uuid, _secondary uuid, _escalation smallint, _approve boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a int := public.job_authority(_job_id);
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF a >= 3 THEN RETURN true; END IF;
  IF _primary = auth.uid() THEN RETURN true; END IF;
  IF _secondary = auth.uid() THEN
    RETURN (NOT _approve) OR _primary IS NULL OR _escalation >= 1;
  END IF;
  IF a >= 2 AND (_escalation >= 2 OR (_primary IS NULL AND _secondary IS NULL)) THEN RETURN true; END IF;
  RETURN false;
END $$;
GRANT EXECUTE ON FUNCTION public.can_act_on_stage(uuid, uuid, uuid, smallint, boolean) TO authenticated;

DROP POLICY IF EXISTS "assignees and managers update job_stages" ON public.job_stages;
CREATE POLICY "assignees and managers update job_stages" ON public.job_stages
  FOR UPDATE TO authenticated
  USING (public.can_access_job(job_id) AND public.can_act_on_stage(job_id, primary_owner_id, secondary_owner_id, escalation_level, false));

CREATE OR REPLACE FUNCTION public.guard_stage_approval_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF (NEW.status IN ('approved', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status)
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
  THEN
    IF NOT public.can_act_on_stage(OLD.job_id, OLD.primary_owner_id, OLD.secondary_owner_id, OLD.escalation_level, true) THEN
      RAISE EXCEPTION 'Only the primary owner (or the backup owner once escalated), an escalated manager or the board can approve or reject this step.';
    END IF;
  END IF;

  IF (NEW.primary_owner_id IS DISTINCT FROM OLD.primary_owner_id
      OR NEW.secondary_owner_id IS DISTINCT FROM OLD.secondary_owner_id
      OR NEW.escalation_level IS DISTINCT FROM OLD.escalation_level
      OR NEW.escalated_at IS DISTINCT FROM OLD.escalated_at)
     AND public.job_authority(OLD.job_id) < 3 THEN
    RAISE EXCEPTION 'Only the board or the Owner can reassign steps or change escalation.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','active') THEN
    NEW.escalation_level := 0;
    NEW.escalated_at := NULL;
  END IF;
  RETURN NEW;
END $$;

-- Advance the pipeline on the server so an assignee can hand over to the next owner
CREATE OR REPLACE FUNCTION public.activate_next_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nxt uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.position IS NOT NULL THEN
    SELECT id INTO nxt FROM public.job_stages
      WHERE job_id = NEW.job_id AND status = 'locked' AND position > NEW.position
      ORDER BY position LIMIT 1;
    IF nxt IS NOT NULL THEN
      UPDATE public.job_stages SET status = 'active', sla_started_at = COALESCE(sla_started_at, now()) WHERE id = nxt;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_activate_next_stage ON public.job_stages;
CREATE TRIGGER trg_activate_next_stage AFTER UPDATE ON public.job_stages
  FOR EACH ROW EXECUTE FUNCTION public.activate_next_stage();

-- Chain-of-command escalation of overdue / blocked steps.
-- Level 1 (overdue): primary + secondary owner. Level 2 (1.5x deadline): workspace managers.
-- Level 3 (2x deadline): Owner/Director and Super Admin.
CREATE OR REPLACE FUNCTION public.escalate_overdue_stages()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record; ratio numeric; target smallint; cnt int := 0; recips uuid[]; lbl text; who text;
BEGIN
  FOR s IN
    SELECT st.*, j.org_id, j.job_number, j.client_name
    FROM public.job_stages st JOIN public.jobs j ON j.id = st.job_id
    WHERE st.status IN ('active','pending_approval','rejected')
      AND st.sla_started_at IS NOT NULL AND st.sla_deadline_hours IS NOT NULL AND st.sla_deadline_hours > 0
      AND j.status = 'active'
  LOOP
    ratio := extract(epoch FROM (now() - s.sla_started_at)) / (s.sla_deadline_hours * 3600.0);
    target := CASE WHEN ratio >= 2 THEN 3 WHEN ratio >= 1.5 THEN 2 WHEN ratio >= 1 THEN 1 ELSE 0 END;
    IF target <= s.escalation_level THEN CONTINUE; END IF;

    recips := array_remove(ARRAY[s.primary_owner_id, s.secondary_owner_id], NULL);
    IF target >= 2 THEN
      recips := recips || ARRAY(SELECT DISTINCT user_id FROM public.user_roles WHERE org_id = s.org_id
        AND role IN ('operations_manager','client_manager','accounts_admin','workshop_manager'));
    END IF;
    IF target >= 3 OR cardinality(recips) = 0 THEN
      recips := recips || ARRAY(SELECT DISTINCT user_id FROM public.user_roles WHERE org_id = s.org_id
        AND role IN ('super_admin','owner_director'));
    END IF;

    lbl := COALESCE(s.stage_name, replace(s.stage::text, '_', ' '));
    who := CASE target WHEN 1 THEN 'the backup owner' WHEN 2 THEN 'the managers' ELSE 'the Owner / Super Admin' END;

    INSERT INTO public.notifications (user_id, job_id, title, message, type)
    SELECT DISTINCT u, s.job_id,
      'Escalated: ' || lbl,
      'Job ' || s.job_number || ' (' || COALESCE(s.client_name,'') || ') — "' || lbl || '" is '
        || CASE WHEN s.status = 'rejected' THEN 'blocked after rejection' WHEN s.status = 'pending_approval' THEN 'waiting on approval' ELSE 'overdue' END
        || ' past its ' || s.sla_deadline_hours || 'h deadline. Now escalated to ' || who || '.',
      'escalation'
    FROM unnest(recips) u;

    UPDATE public.job_stages SET escalation_level = target, escalated_at = now() WHERE id = s.id;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END $$;
REVOKE EXECUTE ON FUNCTION public.escalate_overdue_stages() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_overdue_stages() TO service_role;