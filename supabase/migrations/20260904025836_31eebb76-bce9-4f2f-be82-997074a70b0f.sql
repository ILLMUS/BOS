CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ledger_account_id uuid REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  reference text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unmatched',
  matched_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage bank transactions"
  ON public.bank_transactions FOR ALL TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE TRIGGER tg_bank_transactions_updated
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bank_transactions_org_date ON public.bank_transactions (org_id, txn_date DESC);

ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS source_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_source_ref
  ON public.journal_entries (org_id, source_ref) WHERE source_ref IS NOT NULL;