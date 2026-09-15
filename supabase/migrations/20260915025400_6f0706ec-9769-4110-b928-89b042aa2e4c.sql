-- 1. Job numbers should be unique per organization, not globally
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_number_key;

-- Guard against any pre-existing duplicate pairs before adding the new constraint
DELETE FROM public.jobs a USING public.jobs b
WHERE a.id <> b.id AND a.org_id = b.org_id AND a.job_number = b.job_number AND a.created_at > b.created_at;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_org_job_number_key UNIQUE (org_id, job_number);

-- 2. Serialize number generation per org to avoid race-condition duplicates
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE next_num INTEGER; _prefix text;
BEGIN
  SELECT COALESCE(job_prefix,'JOB') INTO _prefix FROM public.organizations WHERE id = NEW.org_id;
  _prefix := COALESCE(_prefix,'JOB');
  -- Lock per (org, prefix) so concurrent inserts can't pick the same number
  PERFORM pg_advisory_xact_lock(hashtext(NEW.org_id::text || ':' || _prefix));
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM char_length(_prefix) + 2) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.jobs
    WHERE org_id = NEW.org_id AND job_number ~ ('^' || _prefix || '-[0-9]+$');
  NEW.job_number := _prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;