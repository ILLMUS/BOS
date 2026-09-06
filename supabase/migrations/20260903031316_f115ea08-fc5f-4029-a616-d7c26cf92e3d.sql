DO $$ BEGIN
  CREATE TYPE public.ledger_account_type AS ENUM ('asset','liability','equity','income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type public.ledger_account_type NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_no integer NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT current_date,
  memo text NOT NULL,
  reference text,
  source text NOT NULL DEFAULT 'manual',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  ledger_account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
  description text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date ON public.journal_entries(org_id, entry_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_accounts TO authenticated;
GRANT ALL ON public.ledger_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members manage ledger accounts" ON public.ledger_accounts;
CREATE POLICY "org members manage ledger accounts" ON public.ledger_accounts
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members manage journal entries" ON public.journal_entries;
CREATE POLICY "org members manage journal entries" ON public.journal_entries
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members manage journal lines" ON public.journal_lines;
CREATE POLICY "org members manage journal lines" ON public.journal_lines
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS tg_ledger_accounts_updated ON public.ledger_accounts;
CREATE TRIGGER tg_ledger_accounts_updated BEFORE UPDATE ON public.ledger_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tg_journal_entries_updated ON public.journal_entries;
CREATE TRIGGER tg_journal_entries_updated BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_journal_entry_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.entry_no IS NULL OR NEW.entry_no = 0 THEN
    SELECT COALESCE(MAX(entry_no), 0) + 1 INTO NEW.entry_no
      FROM public.journal_entries WHERE org_id = NEW.org_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_journal_entry_no ON public.journal_entries;
CREATE TRIGGER tg_journal_entry_no BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_journal_entry_no();

CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(_org_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  IF NOT public.is_org_member(_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  INSERT INTO public.ledger_accounts (org_id, code, name, type) VALUES
    (_org_id,'1000','Bank / Cash','asset'),
    (_org_id,'1100','Accounts Receivable','asset'),
    (_org_id,'1200','Inventory / Materials on hand','asset'),
    (_org_id,'1500','Equipment','asset'),
    (_org_id,'2000','Accounts Payable','liability'),
    (_org_id,'2100','VAT Payable','liability'),
    (_org_id,'2200','Loans','liability'),
    (_org_id,'3000','Owner Capital','equity'),
    (_org_id,'3100','Retained Earnings','equity'),
    (_org_id,'4000','Sales Revenue','income'),
    (_org_id,'4100','Other Income','income'),
    (_org_id,'5000','Materials','expense'),
    (_org_id,'5100','Labour / Subcontractors','expense'),
    (_org_id,'5200','Transport & Fuel','expense'),
    (_org_id,'5300','Equipment Hire','expense'),
    (_org_id,'5400','Salaries & Wages','expense'),
    (_org_id,'5500','Rent & Utilities','expense'),
    (_org_id,'5600','Admin & Office','expense'),
    (_org_id,'5900','Other Expenses','expense')
  ON CONFLICT (org_id, code) DO NOTHING;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

GRANT EXECUTE ON FUNCTION public.seed_chart_of_accounts(uuid) TO authenticated;