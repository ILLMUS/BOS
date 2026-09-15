
CREATE OR REPLACE FUNCTION public.finance_kind_for_stage(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _name IS NULL OR _name = '' THEN NULL
    WHEN lower(_name) ~ 'receipt|payment received|proof of payment' THEN 'receipt'
    WHEN lower(_name) ~ 'invoice|invoicing|billing' THEN 'invoice'
    WHEN lower(_name) ~ 'quot|estimate|proposal' THEN 'quote'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.sync_stage_finance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _kind text;
  _job jobs%ROWTYPE;
  _fd  jsonb;
  _amount numeric := 0;
  _ref text;
  _ext text;
  _status text;
  _due date;
  _url text;
  _issued date;
  _existing uuid;
BEGIN
  _kind := public.finance_kind_for_stage(NEW.stage_name);
  IF _kind IS NULL OR NEW.status = 'locked' THEN RETURN NEW; END IF;

  SELECT * INTO _job FROM jobs WHERE id = NEW.job_id;
  IF _job.id IS NULL THEN RETURN NEW; END IF;
  _fd := COALESCE(NEW.form_data, '{}'::jsonb);

  IF _kind = 'quote' THEN
    _amount := COALESCE(NULLIF(_fd->>'quote_amount','')::numeric,0) + COALESCE(NULLIF(_fd->>'vat_amount','')::numeric,0);
    _ref := NULLIF(_fd->>'quote_ref','');
    _url := NULLIF(_fd->>'quote_document_url','');
  ELSIF _kind = 'invoice' THEN
    _amount := COALESCE(NULLIF(_fd->>'invoice_amount','')::numeric,0);
    _ref := NULLIF(_fd->>'invoice_number','');
    _url := NULLIF(_fd->>'invoice_document_url','');
    _due := NULLIF(_fd->>'due_date','')::date;
  ELSE
    _amount := COALESCE(NULLIF(_fd->>'amount_received','')::numeric,0);
    _ref := NULLIF(_fd->>'receipt_number','');
    _url := NULLIF(_fd->>'receipt_document_url','');
  END IF;

  _ref := COALESCE(_ref, upper(left(_kind,3)) || '-' || COALESCE(_job.job_number,'DRAFT'));
  IF _kind = 'quote' THEN _ref := COALESCE(NULLIF(_fd->>'quote_ref',''), 'QT-' || COALESCE(_job.job_number,'DRAFT')); END IF;
  IF _kind = 'invoice' THEN _ref := COALESCE(NULLIF(_fd->>'invoice_number',''), 'INV-' || COALESCE(_job.job_number,'DRAFT')); END IF;
  IF _kind = 'receipt' THEN _ref := COALESCE(NULLIF(_fd->>'receipt_number',''), 'REC-' || COALESCE(_job.job_number,'DRAFT')); END IF;

  _ext := 'stage:' || NEW.id || ':' || _kind;
  _issued := COALESCE(NULLIF(_fd->>'payment_date','')::date, NULLIF(_fd->>'quote_date','')::date, CURRENT_DATE);

  IF _kind = 'receipt' THEN
    _status := CASE WHEN _amount > 0 THEN 'paid' ELSE 'draft' END;
  ELSIF NEW.status = 'approved' THEN
    _status := CASE WHEN _kind = 'quote' THEN 'accepted' ELSE 'issued' END;
  ELSE
    _status := CASE WHEN _amount > 0 THEN 'issued' ELSE 'draft' END;
  END IF;

  SELECT id INTO _existing FROM finance_documents
   WHERE org_id = _job.org_id AND external_id = _ext;

  IF _existing IS NOT NULL THEN
    UPDATE finance_documents SET
      doc_type = _kind, reference = _ref, amount = _amount, status = _status,
      issued_at = _issued, due_date = _due, document_url = _url,
      client_name = _job.client_name, account_id = _job.account_id,
      deal_id = _job.deal_id, job_id = _job.id, synced_at = now(), updated_at = now()
    WHERE id = _existing;
  ELSE
    INSERT INTO finance_documents (org_id, doc_type, reference, external_id, source, amount,
      currency, status, issued_at, due_date, document_url, client_name, account_id, deal_id, job_id, synced_at)
    VALUES (_job.org_id, _kind, _ref, _ext, 'workflow', _amount, 'SZL', _status, _issued, _due, _url,
      _job.client_name, _job.account_id, _job.deal_id, _job.id, now());
  END IF;

  IF _kind = 'receipt' AND _amount > 0 THEN
    IF EXISTS (SELECT 1 FROM job_payments WHERE job_id = _job.id AND reference = _ref) THEN
      UPDATE job_payments SET amount = _amount, method = NULLIF(_fd->>'payment_method',''),
        paid_at = _issued, proof_url = _url, updated_at = now()
      WHERE job_id = _job.id AND reference = _ref;
    ELSE
      INSERT INTO job_payments (job_id, payment_type, amount, method, reference, paid_at, proof_url, recorded_by)
      VALUES (_job.id, 'payment', _amount, NULLIF(_fd->>'payment_method',''), _ref, _issued, _url,
        COALESCE(auth.uid(), _job.created_by));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_stage_finance ON public.job_stages;
CREATE TRIGGER trg_sync_stage_finance
AFTER INSERT OR UPDATE OF form_data, status, stage_name ON public.job_stages
FOR EACH ROW EXECUTE FUNCTION public.sync_stage_finance();

-- Backfill existing money steps
UPDATE public.job_stages SET updated_at = updated_at
WHERE status <> 'locked' AND public.finance_kind_for_stage(stage_name) IS NOT NULL;
