CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ZAR',
  spent_at date NOT NULL DEFAULT CURRENT_DATE,
  vendor text,
  method text,
  reference text,
  receipt_url text,
  billable boolean NOT NULL DEFAULT false,
  notes text,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Org members can add expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND recorded_by = auth.uid());

CREATE POLICY "Owners or admins can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND (recorded_by = auth.uid() OR public.is_org_admin(org_id)))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Owners or admins can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND (recorded_by = auth.uid() OR public.is_org_admin(org_id)));

CREATE INDEX idx_expenses_org ON public.expenses(org_id, spent_at DESC);
CREATE INDEX idx_expenses_job ON public.expenses(job_id);
CREATE INDEX idx_expenses_account ON public.expenses(account_id);
CREATE INDEX idx_expenses_deal ON public.expenses(deal_id);

CREATE TRIGGER tg_expenses_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();