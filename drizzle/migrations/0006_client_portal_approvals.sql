-- 1. Client access code on jobs (a short password the client must type to approve)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS client_access_code text;

UPDATE public.jobs
SET client_access_code = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE client_access_code IS NULL;

CREATE OR REPLACE FUNCTION public.set_client_access_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.client_access_code IS NULL OR btrim(NEW.client_access_code) = '' THEN
    NEW.client_access_code := upper(substr(md5(random()::text || COALESCE(NEW.id::text, clock_timestamp()::text)), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_client_access_code ON public.jobs;
CREATE TRIGGER trg_set_client_access_code
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_client_access_code();

-- 2. Which steps are client-approval steps
CREATE OR REPLACE FUNCTION public.stage_needs_client_approval(_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(COALESCE(_name, '')) ~ '(approval|approve|sign[- _]?off|acceptance|client\s*confirm|customer\s*confirm)';
$$;

-- 3. Record of every client decision
CREATE TABLE IF NOT EXISTS public.client_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.job_stages(id) ON DELETE CASCADE,
  org_id uuid,
  decision text NOT NULL CHECK (decision IN ('approved', 'declined')),
  client_name text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_approvals_stage ON public.client_approvals(stage_id);
CREATE INDEX IF NOT EXISTS idx_client_approvals_job ON public.client_approvals(job_id);

GRANT SELECT ON public.client_approvals TO authenticated;
GRANT ALL ON public.client_approvals TO service_role;

ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team reads client approvals" ON public.client_approvals;
CREATE POLICY "team reads client approvals" ON public.client_approvals
FOR SELECT TO authenticated
USING (public.can_access_job(job_id));

-- 4. Public tracking payload now carries the dynamic steps and their client-approval state
CREATE OR REPLACE FUNCTION public.get_job_by_tracking_token(_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job RECORD;
  _stages json;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE tracking_token = _token AND status != 'cancelled';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.position, s.created_at) INTO _stages
  FROM (
    SELECT
      js.id,
      js.stage,
      js.stage_name,
      js.position,
      js.status,
      js.notes,
      js.form_data,
      js.sla_deadline_hours,
      js.sla_started_at,
      js.approved_at,
      js.created_at,
      js.updated_at,
      public.stage_needs_client_approval(js.stage_name) AS needs_client_approval,
      ca.decision AS client_decision,
      ca.client_name AS client_decided_by,
      ca.comment AS client_comment,
      ca.created_at AS client_decided_at
    FROM public.job_stages js
    LEFT JOIN LATERAL (
      SELECT decision, client_name, comment, created_at
      FROM public.client_approvals
      WHERE stage_id = js.id
      ORDER BY created_at DESC
      LIMIT 1
    ) ca ON true
    WHERE js.job_id = _job.id
  ) s;

  RETURN json_build_object(
    'id', _job.id,
    'job_number', _job.job_number,
    'client_name', _job.client_name,
    'service_type', _job.service_type,
    'status', _job.status,
    'current_stage', _job.current_stage,
    'current_sop_stage_id', _job.current_sop_stage_id,
    'created_at', _job.created_at,
    'stages', _stages
  );
END;
$$;

-- 5. The client's own decision, protected by their client ID
CREATE OR REPLACE FUNCTION public.submit_client_approval(
  _token text,
  _code text,
  _stage_id uuid,
  _decision text,
  _client_name text,
  _comment text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job RECORD;
  _stage RECORD;
  _recipient record;
  _title text;
  _message text;
BEGIN
  IF _decision NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'Unknown decision';
  END IF;

  SELECT * INTO _job FROM public.jobs WHERE tracking_token = _token AND status != 'cancelled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This tracking link is no longer valid.';
  END IF;

  IF upper(btrim(COALESCE(_code, ''))) <> upper(btrim(COALESCE(_job.client_access_code, '~none~'))) THEN
    RAISE EXCEPTION 'That client ID is not correct.';
  END IF;

  SELECT * INTO _stage FROM public.job_stages WHERE id = _stage_id AND job_id = _job.id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Step not found for this job.';
  END IF;

  IF _stage.status = 'locked' THEN
    RAISE EXCEPTION 'This step is not ready for your review yet.';
  END IF;

  IF NOT public.stage_needs_client_approval(_stage.stage_name) THEN
    RAISE EXCEPTION 'This step does not need your approval.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.client_approvals WHERE stage_id = _stage_id AND decision = 'approved') THEN
    RAISE EXCEPTION 'You have already approved this step.';
  END IF;

  INSERT INTO public.client_approvals (job_id, stage_id, org_id, decision, client_name, comment)
  VALUES (_job.id, _stage_id, _job.org_id, _decision, NULLIF(btrim(COALESCE(_client_name, '')), ''), NULLIF(btrim(COALESCE(_comment, '')), ''));

  UPDATE public.job_stages
  SET form_data = COALESCE(form_data, '{}'::jsonb) || jsonb_build_object(
        'client_decision', _decision,
        'client_decided_by', COALESCE(NULLIF(btrim(COALESCE(_client_name, '')), ''), _job.client_name),
        'client_decided_at', now()
      )
  WHERE id = _stage_id;

  _title := CASE WHEN _decision = 'approved'
    THEN 'Client approved "' || COALESCE(_stage.stage_name, 'a step') || '" on ' || _job.job_number
    ELSE 'Client declined "' || COALESCE(_stage.stage_name, 'a step') || '" on ' || _job.job_number END;
  _message := COALESCE(NULLIF(btrim(COALESCE(_client_name, '')), ''), _job.client_name)
    || CASE WHEN _decision = 'approved' THEN ' approved this step from the tracking link.' ELSE ' declined this step from the tracking link.' END
    || COALESCE(' Message: ' || NULLIF(btrim(COALESCE(_comment, '')), ''), '');

  FOR _recipient IN
    SELECT DISTINCT u.user_id FROM (
      SELECT user_id FROM public.user_roles
      WHERE org_id = _job.org_id
        AND role IN ('operations_manager','client_manager','accounts_admin','workshop_manager','owner_director','super_admin')
      UNION
      SELECT _stage.primary_owner_id
      UNION
      SELECT _stage.secondary_owner_id
    ) u
    WHERE u.user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, job_id, title, message, type)
    VALUES (_recipient.user_id, _job.id, _title, _message, 'client_approval');
  END LOOP;

  RETURN json_build_object('success', true, 'decision', _decision);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_client_approval(text, text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_approval(text, text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_by_tracking_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_needs_client_approval(text) TO anon, authenticated;
