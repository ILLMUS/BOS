CREATE OR REPLACE FUNCTION public.notify_finance_mismatch(
  _job_id uuid,
  _title text,
  _message text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _count integer := 0;
BEGIN
  SELECT org_id INTO _org FROM public.jobs WHERE id = _job_id;
  IF _org IS NULL THEN RETURN 0; END IF;

  -- only members of the job's workspace may raise these alerts
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = _org AND m.user_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  WITH targets AS (
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.org_id = _org
      AND ur.role IN ('accounts_admin', 'owner_director', 'super_admin')
  ), inserted AS (
    INSERT INTO public.notifications (user_id, job_id, title, message, type)
    SELECT t.user_id, _job_id, _title, _message, 'finance_mismatch'
    FROM targets t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = t.user_id
        AND n.job_id = _job_id
        AND n.type = 'finance_mismatch'
        AND n.message = _message
        AND n.created_at > now() - interval '12 hours'
    )
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM inserted;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_finance_mismatch(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_finance_mismatch(uuid, text, text) TO authenticated;