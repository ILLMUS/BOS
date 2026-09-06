-- Chain of command: numeric authority per org
CREATE OR REPLACE FUNCTION public.org_authority(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND org_id = _org_id AND role = 'super_admin') THEN 4
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND org_id = _org_id AND role = 'owner_director') THEN 3
    WHEN EXISTS (
      SELECT 1 FROM public.user_org_roles uor
      JOIN public.org_roles r ON r.id = uor.org_role_id
      WHERE uor.user_id = auth.uid() AND uor.org_id = _org_id AND r.is_admin
    ) THEN 3
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND org_id = _org_id
                   AND role IN ('operations_manager','client_manager','accounts_admin','workshop_manager')) THEN 2
    WHEN EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = _org_id AND user_id = auth.uid()) THEN 1
    ELSE 0
  END
$$;

REVOKE ALL ON FUNCTION public.org_authority(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_authority(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.job_authority(_job_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT public.org_authority(j.org_id) FROM public.jobs j WHERE j.id = _job_id), 0)
$$;

REVOKE ALL ON FUNCTION public.job_authority(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.job_authority(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_stage_owner(_stage_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_stages s
    WHERE s.id = _stage_id
      AND (s.primary_owner_id = auth.uid() OR s.secondary_owner_id = auth.uid())
  )
$$;

REVOKE ALL ON FUNCTION public.is_stage_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_stage_owner(uuid) TO authenticated;

-- Work steps: read for the whole org, write only for assignees, managers and the board
DROP POLICY IF EXISTS "org members manage job_stages" ON public.job_stages;

CREATE POLICY "members read job_stages"
  ON public.job_stages FOR SELECT TO authenticated
  USING (public.can_access_job(job_id));

CREATE POLICY "assignees and managers insert job_stages"
  ON public.job_stages FOR INSERT TO authenticated
  WITH CHECK (public.can_access_job(job_id) AND public.job_authority(job_id) >= 2);

CREATE POLICY "assignees and managers update job_stages"
  ON public.job_stages FOR UPDATE TO authenticated
  USING (
    public.can_access_job(job_id)
    AND (public.job_authority(job_id) >= 2
         OR primary_owner_id = auth.uid()
         OR secondary_owner_id = auth.uid())
  )
  WITH CHECK (
    public.can_access_job(job_id)
    AND (public.job_authority(job_id) >= 2
         OR primary_owner_id = auth.uid()
         OR secondary_owner_id = auth.uid())
  );

CREATE POLICY "board deletes job_stages"
  ON public.job_stages FOR DELETE TO authenticated
  USING (public.job_authority(job_id) >= 3);

-- Jobs: editing requires manager level or above
DROP POLICY IF EXISTS "members update jobs" ON public.jobs;

CREATE POLICY "managers update jobs"
  ON public.jobs FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_authority(org_id) >= 2)
  WITH CHECK (public.is_org_member(org_id) AND public.org_authority(org_id) >= 2);