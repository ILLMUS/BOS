-- ============ ENUMS ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'drone_pilot';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client_manager';

ALTER TYPE public.job_stage ADD VALUE IF NOT EXISTS 'pre_flight_check';
ALTER TYPE public.job_stage ADD VALUE IF NOT EXISTS 'flight_execution';
ALTER TYPE public.job_stage ADD VALUE IF NOT EXISTS 'post_flight_log';
ALTER TYPE public.job_stage ADD VALUE IF NOT EXISTS 'invoicing';

-- ============ JOBS PATCH ============
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_category text NOT NULL DEFAULT 'fabrication',
  ADD COLUMN IF NOT EXISTS farm_size_ha numeric,
  ADD COLUMN IF NOT EXISTS field_boundary jsonb;

-- ============ PRE-FLIGHT CHECKS ============
CREATE TABLE IF NOT EXISTS public.pre_flight_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  drone_ok boolean NOT NULL DEFAULT false,
  battery_pct integer,
  spray_system_ok boolean NOT NULL DEFAULT false,
  calibration_ok boolean NOT NULL DEFAULT false,
  weather_ok boolean NOT NULL DEFAULT false,
  weather_notes text,
  manager_approved_by uuid,
  manager_approved_at timestamptz,
  performed_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pre_flight_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage preflight" ON public.pre_flight_checks
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned view preflight" ON public.pre_flight_checks
  FOR SELECT USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = pre_flight_checks.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned create preflight" ON public.pre_flight_checks
  FOR INSERT WITH CHECK (auth.uid() = performed_by AND EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = pre_flight_checks.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned update preflight" ON public.pre_flight_checks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = pre_flight_checks.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));

CREATE TRIGGER tg_pfc_updated BEFORE UPDATE ON public.pre_flight_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SPRAY LOGS ============
CREATE TABLE IF NOT EXISTS public.spray_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  chemical_used text NOT NULL,
  quantity_l numeric NOT NULL,
  area_covered_ha numeric NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  pilot_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.spray_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spray" ON public.spray_logs
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned view spray" ON public.spray_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = spray_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned create spray" ON public.spray_logs
  FOR INSERT WITH CHECK (auth.uid() = pilot_id AND EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = spray_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));

CREATE TRIGGER tg_spray_updated BEFORE UPDATE ON public.spray_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FLIGHT LOGS ============
CREATE TABLE IF NOT EXISTS public.flight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  pilot_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  flight_path jsonb,
  battery_start integer,
  battery_end integer,
  duration_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage flight" ON public.flight_logs
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned view flight" ON public.flight_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = flight_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned create flight" ON public.flight_logs
  FOR INSERT WITH CHECK (auth.uid() = pilot_id AND EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = flight_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned update flight" ON public.flight_logs
  FOR UPDATE USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = flight_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));

CREATE TRIGGER tg_flight_updated BEFORE UPDATE ON public.flight_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ POST-FLIGHT LOGS ============
CREATE TABLE IF NOT EXISTS public.post_flight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  equipment_cleaned boolean NOT NULL DEFAULT false,
  inspection_passed boolean NOT NULL DEFAULT false,
  data_submitted boolean NOT NULL DEFAULT false,
  inspection_notes text,
  completed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_flight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage postflight" ON public.post_flight_logs
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned view postflight" ON public.post_flight_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = post_flight_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned create postflight" ON public.post_flight_logs
  FOR INSERT WITH CHECK (auth.uid() = completed_by AND EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = post_flight_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));
CREATE POLICY "Assigned update postflight" ON public.post_flight_logs
  FOR UPDATE USING (EXISTS (SELECT 1 FROM job_stages js WHERE js.job_id = post_flight_logs.job_id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid())));

CREATE TRIGGER tg_pfl_updated BEFORE UPDATE ON public.post_flight_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();