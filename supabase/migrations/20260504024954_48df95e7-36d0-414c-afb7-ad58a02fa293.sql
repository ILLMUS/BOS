
-- Variations (change orders)
CREATE TABLE public.job_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  variation_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  client_decision_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, variation_number)
);

ALTER TABLE public.job_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage variations" ON public.job_variations
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));

CREATE POLICY "Assigned users view variations" ON public.job_variations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = job_variations.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE POLICY "Assigned users create variations" ON public.job_variations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = job_variations.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE POLICY "Assigned users update variations" ON public.job_variations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = job_variations.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE TRIGGER update_job_variations_updated_at
  BEFORE UPDATE ON public.job_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment variation_number per job
CREATE OR REPLACE FUNCTION public.set_variation_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.variation_number IS NULL OR NEW.variation_number = 0 THEN
    SELECT COALESCE(MAX(variation_number), 0) + 1
      INTO NEW.variation_number
      FROM public.job_variations WHERE job_id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_variation_number_trigger
  BEFORE INSERT ON public.job_variations
  FOR EACH ROW EXECUTE FUNCTION public.set_variation_number();

-- Payment ledger
CREATE TABLE public.job_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  payment_type TEXT NOT NULL, -- deposit | progress | variation | final | refund
  amount NUMERIC(12,2) NOT NULL,
  method TEXT, -- eft | cash | card | other
  reference TEXT,
  paid_at DATE NOT NULL,
  proof_url TEXT,
  variation_id UUID,
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payments" ON public.job_payments
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));

CREATE POLICY "Assigned users view payments" ON public.job_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = job_payments.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE POLICY "Assigned users create payments" ON public.job_payments
  FOR INSERT WITH CHECK (
    auth.uid() = recorded_by AND
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = job_payments.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE TRIGGER update_job_payments_updated_at
  BEFORE UPDATE ON public.job_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shop drawings (approval gate before fabrication)
CREATE TABLE public.shop_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | superseded
  client_approved_at TIMESTAMPTZ,
  client_approver_name TEXT,
  rejection_reason TEXT,
  uploaded_by UUID NOT NULL,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage drawings" ON public.shop_drawings
  FOR ALL USING (is_admin_or_owner(auth.uid())) WITH CHECK (is_admin_or_owner(auth.uid()));

CREATE POLICY "Assigned users view drawings" ON public.shop_drawings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = shop_drawings.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE POLICY "Assigned users create drawings" ON public.shop_drawings
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = shop_drawings.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE POLICY "Assigned users update drawings" ON public.shop_drawings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.job_stages js WHERE js.job_id = shop_drawings.job_id
            AND (js.primary_owner_id = auth.uid() OR js.secondary_owner_id = auth.uid()))
  );

CREATE TRIGGER update_shop_drawings_updated_at
  BEFORE UPDATE ON public.shop_drawings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_variations_job ON public.job_variations(job_id);
CREATE INDEX idx_payments_job ON public.job_payments(job_id);
CREATE INDEX idx_drawings_job ON public.shop_drawings(job_id);
