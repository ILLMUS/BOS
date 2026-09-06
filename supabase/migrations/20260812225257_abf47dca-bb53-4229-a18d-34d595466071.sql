
-- Audit the commercial -> operational transition, reusing existing job/workflow RPCs.

CREATE OR REPLACE FUNCTION public.close_deal(_deal_id uuid, _won boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _d RECORD;
BEGIN
  SELECT * INTO _d FROM public.deals WHERE id = _deal_id;
  IF _d IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF NOT public.is_org_member(_d.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  UPDATE public.deals
    SET status = CASE WHEN _won THEN 'won'::deal_status ELSE 'lost'::deal_status END,
        closed_at = now(),
        lost_reason = CASE WHEN _won THEN NULL ELSE _reason END
    WHERE id = _deal_id;

  IF _d.opportunity_id IS NOT NULL THEN
    UPDATE public.opportunities
      SET stage = CASE WHEN _won THEN 'won'::opportunity_stage ELSE 'lost'::opportunity_stage END
      WHERE id = _d.opportunity_id;
  END IF;

  IF _d.account_id IS NOT NULL THEN
    UPDATE public.accounts
      SET lifecycle_stage = CASE WHEN _won THEN 'client'::lifecycle_stage ELSE 'lost'::lifecycle_stage END
      WHERE id = _d.account_id;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, org_id, action, details)
    VALUES (auth.uid(), _d.org_id,
            CASE WHEN _won THEN 'deal_won' ELSE 'deal_lost' END,
            jsonb_build_object('deal_id', _d.id, 'deal_name', _d.name, 'account_id', _d.account_id,
                               'opportunity_id', _d.opportunity_id, 'value', _d.value, 'reason', _reason));
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_job_from_deal(_deal_id uuid, _template_id uuid, _service_type text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _d RECORD; _acc RECORD; _c RECORD; _job_id uuid; _tpl RECORD; _job RECORD;
BEGIN
  SELECT * INTO _d FROM public.deals WHERE id = _deal_id;
  IF _d IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF NOT public.is_org_member(_d.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;
  IF _d.job_id IS NOT NULL THEN RAISE EXCEPTION 'This deal already has work in progress'; END IF;

  SELECT * INTO _tpl FROM public.sop_templates WHERE id = _template_id;
  IF _tpl IS NULL OR _tpl.org_id <> _d.org_id THEN RAISE EXCEPTION 'Workflow not found in this organization'; END IF;

  SELECT * INTO _acc FROM public.accounts WHERE id = _d.account_id;
  SELECT * INTO _c FROM public.contacts WHERE id = _d.contact_id;

  -- Reuse the existing workflow creation logic (stages, SLA, owner assignment triggers).
  _job_id := public.create_job_from_template(
    _template_id,
    COALESCE(_acc.name, _d.name),
    COALESCE(_c.phone, _acc.phone),
    COALESCE(_c.email, _acc.email),
    _acc.location,
    COALESCE(NULLIF(btrim(_service_type), ''), _d.name)
  );

  UPDATE public.jobs SET account_id = _d.account_id, deal_id = _d.id WHERE id = _job_id;
  UPDATE public.deals
    SET job_id = _job_id,
        status = 'won'::deal_status,
        closed_at = COALESCE(closed_at, now())
    WHERE id = _d.id;

  IF _d.account_id IS NOT NULL THEN
    UPDATE public.accounts SET lifecycle_stage = 'client'::lifecycle_stage
      WHERE id = _d.account_id AND lifecycle_stage <> 'client';
  END IF;

  SELECT j.job_number, s.stage_name, s.sla_deadline_hours, s.primary_owner_id, s.secondary_owner_id
    INTO _job
    FROM public.jobs j
    LEFT JOIN public.job_stages s ON s.job_id = j.id AND s.status = 'active'
    WHERE j.id = _job_id
    ORDER BY s.position LIMIT 1;

  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, org_id, job_id, action, details)
    VALUES (auth.uid(), _d.org_id, _job_id, 'work_started_from_deal',
            jsonb_build_object(
              'deal_id', _d.id, 'deal_name', _d.name, 'account_id', _d.account_id,
              'opportunity_id', _d.opportunity_id, 'lead_id', NULL,
              'template_id', _template_id, 'template_name', _tpl.name, 'template_version', _tpl.version,
              'job_number', _job.job_number, 'first_stage', _job.stage_name,
              'sla_hours', _job.sla_deadline_hours,
              'primary_owner_id', _job.primary_owner_id, 'secondary_owner_id', _job.secondary_owner_id));
  END IF;

  RETURN _job_id;
END;
$function$;
