
-- Create role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'lead_handler',
  'site_assessor',
  'estimator',
  'quotation_officer',
  'workshop_manager',
  'fabrication_team',
  'installation_team',
  'accounts_admin',
  'owner_director'
);

-- Create job stage enum
CREATE TYPE public.job_stage AS ENUM (
  'lead_entry',
  'lead_qualification',
  'site_visit_authorization',
  'site_assessment',
  'job_scoping',
  'costing',
  'quotation_preparation',
  'quote_submission',
  'client_approval',
  'fabrication_order',
  'fabrication_installation',
  'project_closure'
);

-- Create stage status enum
CREATE TYPE public.stage_status AS ENUM (
  'locked',
  'active',
  'pending_approval',
  'approved',
  'rejected'
);

-- Create job status enum
CREATE TYPE public.job_status AS ENUM (
  'active',
  'completed',
  'on_hold',
  'cancelled'
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'owner_director')) $$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id $$;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  client_location TEXT,
  service_type TEXT,
  current_stage job_stage NOT NULL DEFAULT 'lead_entry',
  status job_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Job stages table
CREATE TABLE public.job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage job_stage NOT NULL,
  status stage_status NOT NULL DEFAULT 'locked',
  primary_owner_id UUID REFERENCES auth.users(id),
  secondary_owner_id UUID REFERENCES auth.users(id),
  form_data JSONB DEFAULT '{}',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, stage)
);
ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;

-- Stage assignments
CREATE TABLE public.stage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage job_stage NOT NULL,
  primary_role app_role NOT NULL,
  secondary_role app_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stage)
);
ALTER TABLE public.stage_assignments ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  stage job_stage,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins can view all jobs" ON public.jobs FOR SELECT USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Users can view assigned jobs" ON public.jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = jobs.id AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
);
CREATE POLICY "Authenticated users can create jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update jobs" ON public.jobs FOR UPDATE USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned users can update jobs" ON public.jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = jobs.id AND js.stage = jobs.current_stage AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
);

CREATE POLICY "Admins can view all stages" ON public.job_stages FOR SELECT USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned users can view stages" ON public.job_stages FOR SELECT USING (primary_owner_id = auth.uid() OR secondary_owner_id = auth.uid());
CREATE POLICY "Admins can manage stages" ON public.job_stages FOR ALL USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Assigned users can update their stages" ON public.job_stages FOR UPDATE USING (primary_owner_id = auth.uid() OR secondary_owner_id = auth.uid());
CREATE POLICY "Authenticated can insert stages" ON public.job_stages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view assignments" ON public.stage_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage assignments" ON public.stage_assignments FOR ALL USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "Authenticated can insert audit entries" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_stages_updated_at BEFORE UPDATE ON public.job_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate job numbers
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 5) AS INTEGER)), 0) + 1 INTO next_num FROM public.jobs;
  NEW.job_number := 'RST-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_job_number BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.generate_job_number();

-- Default stage assignments
INSERT INTO public.stage_assignments (stage, primary_role, secondary_role) VALUES
  ('lead_entry', 'lead_handler', 'accounts_admin'),
  ('lead_qualification', 'lead_handler', 'owner_director'),
  ('site_visit_authorization', 'owner_director', 'accounts_admin'),
  ('site_assessment', 'site_assessor', 'lead_handler'),
  ('job_scoping', 'site_assessor', 'estimator'),
  ('costing', 'estimator', 'accounts_admin'),
  ('quotation_preparation', 'quotation_officer', 'estimator'),
  ('quote_submission', 'quotation_officer', 'lead_handler'),
  ('client_approval', 'lead_handler', 'owner_director'),
  ('fabrication_order', 'workshop_manager', 'owner_director'),
  ('fabrication_installation', 'fabrication_team', 'installation_team'),
  ('project_closure', 'accounts_admin', 'owner_director');
