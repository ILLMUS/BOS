CREATE OR REPLACE FUNCTION public.ensure_my_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_org_id uuid;
  _resolved_org_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT p.org_id
    INTO _current_org_id
    FROM public.profiles p
   WHERE p.id = _user_id;

  IF _current_org_id IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.organization_members m
     WHERE m.user_id = _user_id
       AND m.org_id = _current_org_id
  ) THEN
    RETURN _current_org_id;
  END IF;

  SELECT m.org_id
    INTO _resolved_org_id
    FROM public.organization_members m
   WHERE m.user_id = _user_id
   ORDER BY m.created_at ASC
   LIMIT 1;

  IF _resolved_org_id IS NOT NULL THEN
    UPDATE public.profiles
       SET org_id = _resolved_org_id
     WHERE id = _user_id
       AND org_id IS DISTINCT FROM _resolved_org_id;
  END IF;

  RETURN _resolved_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_my_workspace() TO service_role;